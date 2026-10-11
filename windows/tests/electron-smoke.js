/**
 * Electron smoke test: starts the real app (src/main.js), clicks the toolbar with real
 * mouse events, runs every menu item that doesn't open a native dialog, and fails on any
 * renderer error. Run with `npm run smoke` (on Linux CI wrap it in xvfb-run).
 */
const { app } = require('electron');
const path = require('path');

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
                const skip = ['open-file', 'import-image', 'save-project', 'save-as-project', 'export-png', 'export-jpeg'];
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

require('../src/main.js');
