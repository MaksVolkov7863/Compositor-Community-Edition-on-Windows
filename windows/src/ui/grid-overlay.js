/**
 * Draws the layout grid over the canvas in screen space (crisp at every zoom and pan) and runs
 * View > Grid Settings…: spacing, subdivisions, color, style and opacity, previewed live and
 * remembered between sessions, as on the Mac.
 */
(function () {
    const STORAGE_KEY = 'compositor.grid';
    let canvas = null;
    let saved = null; // grid + appearance before the dialog opened, for Cancel

    function el(id) { return document.getElementById(id); }

    function load() {
        try {
            const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
            if (stored) {
                engine.layoutGrid = new LayoutGrid(stored.spacing, stored.subdivisions);
                engine.gridAppearance = new GridAppearance(stored);
                engine.snapToGrid = !!stored.snapToGrid;
                return;
            }
        } catch (_) {}
        engine.gridAppearance = new GridAppearance();
    }

    function save() {
        const g = engine.layoutGrid, a = engine.gridAppearance;
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            spacing: g.spacing, subdivisions: g.subdivisions, preset: a.preset, style: a.style, opacity: a.opacity,
            snapToGrid: engine.snapToGrid
        }));
    }

    function ensureCanvas() {
        if (canvas) return canvas;
        canvas = document.createElement('canvas');
        canvas.id = 'gridCanvas';
        canvas.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;z-index:5';
        el('viewport').appendChild(canvas);
        return canvas;
    }

    function redraw() {
        const c = ensureCanvas();
        const viewport = el('viewport');
        const dpr = window.devicePixelRatio || 1;
        const w = viewport.clientWidth, h = viewport.clientHeight;
        if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
            c.width = Math.round(w * dpr);
            c.height = Math.round(h * dpr);
            c.style.width = w + 'px';
            c.style.height = h + 'px';
        }
        const ctx = c.getContext('2d');
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, c.width, c.height);
        if (!engine.showGrid || !engine.layoutGrid) return 0;
        const vr = viewport.getBoundingClientRect();
        const cr = el('canvasContainer').getBoundingClientRect();
        const view = {
            originX: (cr.left - vr.left) * dpr,
            originY: (cr.top - vr.top) * dpr,
            scale: (cr.width / engine.width) * dpr
        };
        return drawLayoutGrid(ctx, engine.width, engine.height, engine.layoutGrid, engine.gridAppearance, view, { width: c.width, height: c.height });
    }

    function build() {
        if (el('modalGridSettings')) return;
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = 'modalGridSettings';
        overlay.innerHTML = `
            <div class="modal-dialog" style="width:380px">
                <div class="modal-header"><span>Grid</span><button class="modal-close-btn" onclick="GridOverlay.cancelSettings()">×</button></div>
                <div class="modal-content">
                    <div class="form-row"><span class="form-label">Gridline Every:</span>
                        <input type="number" id="gridSpacing" class="form-control" min="2" max="4096" oninput="GridOverlay.previewSettings()"><span>px</span></div>
                    <div class="form-row"><span class="form-label">Subdivisions:</span>
                        <input type="number" id="gridSubdivisions" class="form-control" min="1" max="64" oninput="GridOverlay.previewSettings()"></div>
                    <div class="form-row"><span class="form-label">Color:</span>
                        <select id="gridPreset" class="form-control" onchange="GridOverlay.previewSettings()">
                            ${Object.keys(GRID_PRESETS).map(p => `<option>${p}</option>`).join('')}</select></div>
                    <div class="form-row"><span class="form-label">Style:</span>
                        <select id="gridStyle" class="form-control" onchange="GridOverlay.previewSettings()">
                            ${Object.keys(GRID_STYLES).map(s => `<option>${s}</option>`).join('')}</select></div>
                    <div class="form-row"><span class="form-label">Opacity:</span>
                        <input type="number" id="gridOpacity" class="form-control" min="1" max="100" oninput="GridOverlay.previewSettings()"><span>%</span></div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="GridOverlay.resetSettings()">Defaults</button>
                    <button class="btn btn-secondary" onclick="GridOverlay.cancelSettings()">Cancel</button>
                    <button class="btn btn-primary" onclick="GridOverlay.commitSettings()">OK</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
    }

    function fill() {
        el('gridSpacing').value = engine.layoutGrid.spacing;
        el('gridSubdivisions').value = engine.layoutGrid.subdivisions;
        el('gridPreset').value = engine.gridAppearance.preset;
        el('gridStyle').value = engine.gridAppearance.style;
        el('gridOpacity').value = engine.gridAppearance.opacity;
    }

    const GridOverlay = {
        init() {
            load();
            ensureCanvas();
            window.addEventListener('resize', redraw);
            redraw();
        },
        redraw,
        openSettings() {
            build();
            saved = { grid: engine.layoutGrid, appearance: engine.gridAppearance, showGrid: engine.showGrid };
            fill();
            engine.showGrid = true; // the grid shows while it's being set up
            redraw();
            openModal('modalGridSettings');
        },
        previewSettings() {
            engine.layoutGrid = new LayoutGrid(el('gridSpacing').value, el('gridSubdivisions').value);
            engine.gridAppearance = new GridAppearance({ preset: el('gridPreset').value, style: el('gridStyle').value, opacity: el('gridOpacity').value });
            redraw();
        },
        resetSettings() {
            engine.layoutGrid = new LayoutGrid();
            engine.gridAppearance = new GridAppearance();
            fill();
            redraw();
        },
        commitSettings() {
            GridOverlay.previewSettings();
            save();
            saved = null;
            closeModal('modalGridSettings');
            syncViewState();
        },
        cancelSettings() {
            if (saved) {
                engine.layoutGrid = saved.grid;
                engine.gridAppearance = saved.appearance;
                engine.showGrid = saved.showGrid;
                saved = null;
            }
            redraw();
            closeModal('modalGridSettings');
        },
        save
    };
    window.GridOverlay = GridOverlay;
})();
