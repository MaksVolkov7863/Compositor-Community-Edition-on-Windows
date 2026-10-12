/**
 * Electron smoke test: starts the real app (src/main.js), clicks the toolbar with real
 * mouse events, runs every menu item that doesn't open a native dialog, and fails on any
 * renderer error. Run with `npm run smoke` (on Linux CI wrap it in xvfb-run).
 */
const { app, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Native save dialogs answer with files in a temp folder, so Save and Export run unattended
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'compositor-smoke-'));
const saveAnswers = [];
dialog.showSaveDialog = async () => {
    const filePath = saveAnswers.shift();
    return filePath ? { canceled: false, filePath } : { canceled: true };
};

// Sample files for the importers: TIFF from the bundled encoder, a tiny RGB PSD, and a HEIC
// when COMPOSITOR_SMOKE_HEIC points at one (there's no HEIC encoder to make it here).
function writeSamples() {
    const { encodeTIFF } = require('../src/image-importer');
    const w = 40, h = 30, rgba = new Uint8Array(w * h * 4);
    for (let i = 0; i < rgba.length; i += 4) { rgba[i] = 10; rgba[i + 1] = 200; rgba[i + 2] = 30; rgba[i + 3] = 255; }
    fs.writeFileSync(path.join(tmp, 'sample.tif'), encodeTIFF(rgba, w, h));
    const header = Buffer.alloc(26);
    header.write('8BPS', 0); header.writeUInt16BE(1, 4); header.writeUInt16BE(3, 12);
    header.writeUInt32BE(20, 14); header.writeUInt32BE(25, 18); header.writeUInt16BE(8, 22); header.writeUInt16BE(3, 24);
    const planes = [Buffer.alloc(500, 220), Buffer.alloc(500, 20), Buffer.alloc(500, 40)];
    fs.writeFileSync(path.join(tmp, 'sample.psd'), Buffer.concat([header, Buffer.alloc(12), Buffer.from([0, 0]), ...planes]));
}

const consoleErrors = [];
const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

app.on('browser-window-created', (_event, win) => {
    win.webContents.on('console-message', (_e, level, message, line, source) => {
        if (level >= 3) consoleErrors.push(`${message} (${path.basename(source || '')}:${line})`);
    });
    win.webContents.once('did-finish-load', async () => {
        const js = (code) => win.webContents.executeJavaScript(code);
        try {
            await sleep(1000);
            check(await js(`typeof engine === 'object' && typeof JSZip === 'function'`), 'engine or JSZip missing in renderer');
            await js(`window.__errors = []; window.addEventListener('error', e => window.__errors.push(e.message)); window.alert = () => {}; true`);

            const buttons = await js(`[...document.querySelectorAll('.tool-btn')].map(b => { const r = b.getBoundingClientRect(); return { tool: b.dataset.tool, x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; })`);
            for (const b of buttons) {
                win.webContents.sendInputEvent({ type: 'mouseDown', x: b.x, y: b.y, button: 'left', clickCount: 1 });
                win.webContents.sendInputEvent({ type: 'mouseUp', x: b.x, y: b.y, button: 'left', clickCount: 1 });
                await sleep(50);
                check(await js('engine.currentTool') === b.tool, `toolbar click did not select ${b.tool}`);
            }

            const results = await js(`(async () => {
                const skip = ['open-file', 'import-image', 'save-project', 'save-as-project', 'export-png', 'export-jpeg', 'export-tiff', 'close-tab', 'command-palette'];
                const out = [];
                for (const item of document.querySelectorAll('.dropdown-item')) {
                    const match = (item.getAttribute('onclick') || '').match(/triggerAction\\('([\\w-]+)'/);
                    if (!match || skip.includes(match[1])) continue;
                    engine.setRectSelection(10, 10, 100, 100, false);
                    engine.copySelection();
                    window.__errors = [];
                    try { item.click(); } catch (e) { window.__errors.push(e.message); }
                    await new Promise(r => setTimeout(r, 20));
                    for (const modal of document.querySelectorAll('.modal-overlay.active')) {
                        try { modal.querySelector('.btn-primary')?.click(); } catch (e) { window.__errors.push(e.message); }
                        modal.classList.remove('active');
                    }
                    out.push({ action: match[1], errors: window.__errors.slice() });
                }
                return out;
            })()`);
            check(results.length > 30, `only ${results.length} menu items found`);
            for (const r of results) check(r.errors.length === 0, `${r.action}: ${r.errors.join('; ')}`);

            const before = await js('engine.layers.length');
            win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'N', modifiers: ['control', 'shift'] });
            win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'N', modifiers: ['control', 'shift'] });
            await sleep(200);
            check(await js('engine.layers.length') === before + 1, 'Ctrl+Shift+N should add exactly one layer');
            win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Delete' });
            win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Delete' });
            await sleep(200);
            check(await js('engine.layers.length') === before, 'Delete should remove exactly one layer');

            await featureChecks(win, js);
        } catch (err) {
            failures.push(err.message);
        }
        failures.push(...consoleErrors.map(e => 'renderer: ' + e));
        if (failures.length) {
            console.error('Smoke test FAILED:\n  ' + failures.join('\n  '));
            app.exit(1);
        } else {
            console.log('Smoke test passed.');
            app.exit(0);
        }
    });
});

async function key(win, keyCode, modifiers = []) {
    win.webContents.sendInputEvent({ type: 'keyDown', keyCode, modifiers });
    if (keyCode.length === 1) win.webContents.sendInputEvent({ type: 'char', keyCode, modifiers });
    win.webContents.sendInputEvent({ type: 'keyUp', keyCode, modifiers });
    await sleep(150);
}

async function featureChecks(win, js) {
    // The menu sweep above toggled view options; start from known state
    await js(`document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
        window.confirm = () => true; DocumentTabs.close();
        engine.snapEnabled = true; engine.showRulers = true; if (NavigatorPanel.pinned) NavigatorPanel.toggle(); syncViewState(); true`);

    // Curves: add a point by dragging on the graph, preview, OK, then undo
    const curves = await js(`(async () => {
        const layer = engine.addLayer('Curves');
        layer.ctx.fillStyle = '#404040'; layer.ctx.fillRect(0, 0, engine.width, engine.height);
        engine.recordHistory('Gray');
        triggerAction('filter-curves');
        const c = document.getElementById('curvesCanvas');
        const r = c.getBoundingClientRect();
        const at = (x, y) => ({ clientX: r.left + x / 255 * r.width, clientY: r.top + (1 - y / 255) * r.height, pointerId: 1, bubbles: true });
        c.dispatchEvent(new PointerEvent('pointerdown', at(64, 64)));
        c.dispatchEvent(new PointerEvent('pointermove', at(64, 192)));
        c.dispatchEvent(new PointerEvent('pointerup', at(64, 192)));
        const preview = layer.ctx.getImageData(5, 5, 1, 1).data[0];
        const points = CurvesDialog.settings.channels[0].length;
        CurvesDialog.commit();
        const after = layer.ctx.getImageData(5, 5, 1, 1).data[0];
        const historyName = engine.history[engine.historyIndex].name;
        engine.undo();
        const undone = engine.getActiveLayer().ctx.getImageData(5, 5, 1, 1).data[0];
        triggerAction('filter-curves');
        CurvesDialog.settings.addPoint(64, 255); CurvesDialog.preview(); CurvesDialog.cancel();
        const cancelled = engine.getActiveLayer().ctx.getImageData(5, 5, 1, 1).data[0];
        return { preview, points, after, historyName, undone, cancelled };
    })()`);
    check(curves.points === 3, `curves point added by drag (${curves.points})`);
    check(curves.preview > 150 && curves.after === curves.preview, `curves preview/commit ${JSON.stringify(curves)}`);
    check(curves.historyName === 'Curves' && curves.undone === 64 && curves.cancelled === 64, `curves undo/cancel ${JSON.stringify(curves)}`);

    // Grid: drawn in screen space when shown, following zoom; Snap To Grid uses it
    const grid = await js(`(() => {
        triggerAction('toggle-grid', true);
        engine.zoomTo(2); updateCanvasTransform();
        const lines2x = GridOverlay.redraw();
        const c = document.getElementById('gridCanvas');
        const ctx = c.getContext('2d');
        const vr = document.getElementById('viewport').getBoundingClientRect();
        const cr = document.getElementById('canvasContainer').getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const sx = Math.round((cr.left - vr.left + 64 * 2) * dpr), sy = Math.round((cr.top - vr.top + 10) * dpr);
        const onLine = ctx.getImageData(sx, sy, 1, 1).data[3];
        const offLine = ctx.getImageData(sx + Math.round(3 * dpr), sy, 1, 1).data[3];
        triggerAction('toggle-snap-grid', true);
        const snaps = engine.cropSnapTargets().xs.includes(64 + 8);
        triggerAction('toggle-grid', false);
        const hidden = GridOverlay.redraw();
        triggerAction('toggle-snap-grid', false);
        engine.fitToScreen();
        return { lines2x, onLine, offLine, snaps, hidden };
    })()`);
    check(grid.lines2x > 10 && grid.onLine > 0 && grid.offLine === 0 && grid.snaps && grid.hidden === 0, `grid ${JSON.stringify(grid)}`);

    // Feather / Expand / Contract on a lasso and on an inverted selection, through the dialog
    const refine = await js(`(() => {
        engine.lassoPoints = [{ x: 100, y: 100 }, { x: 300, y: 100 }, { x: 200, y: 300 }];
        engine.finalizeLassoSelection(); engine.lassoPoints = null;
        const b0 = engine.selection.bounds.width;
        triggerAction('select-expand'); document.getElementById('selectionValueInput').value = 10; confirmSelectionValue();
        const expanded = engine.selection.bounds.width;
        triggerAction('select-feather'); document.getElementById('selectionValueInput').value = 8; confirmSelectionValue();
        const soft = engine.selection.mask[(engine.selection.bounds.y + 2) * engine.width + 200];
        engine.setRectSelection(100, 100, 200, 200, false);
        triggerAction('invert-selection');
        triggerAction('select-contract'); document.getElementById('selectionValueInput').value = 5; confirmSelectionValue();
        const inverse = [engine.selection.type, engine.selection.mask[2 * engine.width + 2], engine.selection.mask[150 * engine.width + 97]];
        triggerAction('deselect');
        return { b0, expanded, soft, inverse };
    })()`);
    check(refine.expanded === refine.b0 + 20 && refine.soft > 0 && refine.soft < 255, `lasso refine ${JSON.stringify(refine)}`);
    check(refine.inverse[0] === 'inverse' && refine.inverse[1] === 0 && refine.inverse[2] === 0, `inverse contract ${JSON.stringify(refine)}`);

    // Select Subject and Remove Background on a red disc over a soft gradient
    const vision = await js(`(async () => {
        engine.newCanvas(200, 150, 'transparent');
        const l = engine.getActiveLayer();
        const g = l.ctx.createLinearGradient(0, 0, 200, 0); g.addColorStop(0, '#d8dde3'); g.addColorStop(1, '#c4ccd4');
        l.ctx.fillStyle = g; l.ctx.fillRect(0, 0, 200, 150);
        l.ctx.fillStyle = '#c0282d'; l.ctx.beginPath(); l.ctx.arc(100, 75, 40, 0, Math.PI * 2); l.ctx.fill();
        engine.render();
        const ok = await runVision('select');
        const b = engine.selection && engine.selection.bounds;
        const ok2 = await runVision('remove');
        const masked = engine.getActiveLayer().hasMask;
        return { ok, b, ok2, masked };
    })()`);
    const b = vision.b || {};
    check(vision.ok && Math.abs(b.x - 60) <= 6 && Math.abs(b.width - 80) <= 12, `select subject bounds ${JSON.stringify(vision)}`);
    check(vision.ok2 && vision.masked, `remove background ${JSON.stringify(vision)}`);

    // Command palette: Ctrl+F, type, Enter runs the command
    await js(`document.activeElement && document.activeElement.blur(); triggerAction('deselect'); true`);
    await key(win, 'F', ['control']);
    check(await js('CommandPalette.isOpen'), 'Ctrl+F opens the command palette');
    for (const ch of 'gaussian') await key(win, ch);
    const top = await js(`document.querySelector('#commandPaletteList .dropdown-item')?.textContent || ''`);
    check(/Gaussian Blur/.test(top), `palette ranks Gaussian Blur first (${top})`);
    await key(win, 'Return');
    check(await js(`!CommandPalette.isOpen && document.getElementById('modalBlur').classList.contains('active')`), 'Enter runs the chosen command');
    await js(`closeModal('modalBlur'); true`);

    // Navigator: appears from 300%, clicking it moves the view
    const nav = await js(`(() => {
        engine.zoomTo(1); updateCanvasTransform();
        const hiddenAt100 = !NavigatorPanel.isShown;
        engine.zoomTo(4); updateCanvasTransform();
        const shown = NavigatorPanel.isShown;
        const box = document.getElementById('navigatorMinimap').getBoundingClientRect();
        return { hiddenAt100, shown, x: Math.round(box.right - 5), y: Math.round(box.bottom - 5), panX: engine.viewport.panX };
    })()`);
    win.webContents.sendInputEvent({ type: 'mouseDown', x: nav.x, y: nav.y, button: 'left', clickCount: 1 });
    win.webContents.sendInputEvent({ type: 'mouseUp', x: nav.x, y: nav.y, button: 'left', clickCount: 1 });
    await sleep(100);
    const panAfter = await js('engine.viewport.panX');
    check(nav.hiddenAt100 && nav.shown && panAfter < nav.panX - 50, `navigator ${JSON.stringify(nav)} -> ${panAfter}`);
    await js('engine.fitToScreen(); true');

    // Importers through the main process: TIFF and PSD (and HEIC when a sample is given)
    writeSamples();
    const files = [['sample.tif', 40, 30, 200], ['sample.psd', 25, 20, 20]];
    const heic = process.env.COMPOSITOR_SMOKE_HEIC;
    for (const [name, w, h, green] of files) {
        const r = await js(`(async () => { await openPath(${JSON.stringify(path.join(tmp, name))}); return { w: engine.width, h: engine.height, g: engine.getActiveLayer().ctx.getImageData(1, 1, 1, 1).data[1], tabs: DocumentTabs.tabs.length }; })()`);
        check(r.w === w && r.h === h && r.g === green, `open ${name}: ${JSON.stringify(r)}`);
    }
    if (heic) {
        const r = await js(`(async () => { await openPath(${JSON.stringify(heic)}); return { w: engine.width, h: engine.height, a: engine.getActiveLayer().ctx.getImageData(10, 10, 1, 1).data[3] }; })()`);
        check(r.w > 0 && r.a === 255, `open HEIC: ${JSON.stringify(r)}`);
        console.log('HEIC sample opened:', JSON.stringify(r));
    }

    // Tabs: each open file got its own tab; switching restores each document
    const tabs = await js(`(() => {
        const list = DocumentTabs.tabs;
        DocumentTabs.select(list.find(t => t.title === 'sample.tif').id);
        const first = [engine.width, engine.height];
        DocumentTabs.select(list.find(t => t.title === 'sample.psd').id);
        const last = [engine.width, engine.height];
        return { count: list.length, first, last, rendered: document.querySelectorAll('.document-tab').length };
    })()`);
    check(tabs.count >= 3 && tabs.first[0] === 40 && tabs.last[0] === 25 && tabs.rendered >= 2, `tabs ${JSON.stringify(tabs)}`);

    // Export TIFF, decoded back in the main process
    const tiffPath = path.join(tmp, 'export.tif');
    saveAnswers.push(tiffPath);
    await js('handleExportTIFF()');
    await sleep(300);
    const { ImageImporter } = require('../src/image-importer');
    const exported = fs.existsSync(tiffPath) ? await ImageImporter.shared.decode(tiffPath) : null;
    check(exported && exported.width === 25 && exported.data[1] === 20, 'Export TIFF writes the composite');

    // Save, then change the file from outside: the tab offers to reload it
    const compPath = path.join(tmp, 'watched.comp');
    saveAnswers.push(compPath);
    await js('handleSaveProject(true)');
    await sleep(300);
    check(fs.existsSync(compPath) && await js('DocumentTabs.active.filePath') === compPath, 'Save As remembers the file');
    const otherProject = await js(`(async () => {
        const layer = engine.createLayer('Outside', 77, 33);
        layer.ctx.fillStyle = '#123456'; layer.ctx.fillRect(0, 0, 77, 33);
        return await ProjectStore.serializeProject({ width: 77, height: 33, resolution: 72, activeLayerId: layer.id, guides: { horizontal: [], vertical: [] }, layers: [layer] }, window.JSZip);
    })()`);
    await sleep(700);
    fs.writeFileSync(compPath, Buffer.from(otherProject, 'base64'));
    await sleep(1500);
    check(await js('engine.width') === 77, 'outside change to the open .comp reloads it');

    // View menu checkmarks follow hotkeys in the native menu and the titlebar menu
    await js(`document.activeElement && document.activeElement.blur(); true`);
    await key(win, 'R', ['control']);
    await sleep(100);
    const rulersItem = Menu.getApplicationMenu().getMenuItemById('rulers');
    const titlebarChecked = await js(`document.querySelector('[data-check="rulers"]').classList.contains('checked')`);
    check(rulersItem.checked === false && titlebarChecked === false, `Ctrl+R unchecks Rulers (native ${rulersItem.checked}, titlebar ${titlebarChecked})`);
    await key(win, 'R', ['control']);
    check(Menu.getApplicationMenu().getMenuItemById('rulers').checked === true, 'Ctrl+R checks Rulers again');

    // Tool cursors from CursorManager
    await js(`document.querySelector('[data-tool="hand"]').click(); document.getElementById('viewport').dispatchEvent(new MouseEvent('mouseenter')); true`);
    check(await js(`document.getElementById('viewport').style.cursor`) === 'grab', 'hand tool shows the grab cursor');
}

require('../src/main.js');
