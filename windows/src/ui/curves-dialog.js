/**
 * Curves… dialog, after the macOS CurvesControls: a 0–255 graph with a quarter grid, the
 * curve, and its points. Click to add a point, drag to adjust, Remove Point / Reset Curve,
 * a channel picker (RGB, Red, Green, Blue) and a live preview on the active layer.
 * OK records one history step; Cancel puts the layer back.
 */
(function () {
    const SIZE = 256;
    let settings = null;
    let session = null; // { layer, original }
    let selected = null;
    let dragging = null;

    function el(id) { return document.getElementById(id); }

    function build() {
        if (el('modalCurves')) return;
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = 'modalCurves';
        overlay.innerHTML = `
            <div class="modal-dialog" style="width:360px">
                <div class="modal-header">
                    <span>Curves</span>
                    <button class="modal-close-btn" onclick="CurvesDialog.cancel()">×</button>
                </div>
                <div class="modal-content">
                    <div class="form-row">
                        <span class="form-label">Channel:</span>
                        <select id="curvesChannel" class="form-control" onchange="CurvesDialog.setChannel(parseInt(this.value))">
                            ${CURVE_CHANNELS.map((name, i) => `<option value="${i}">${name}</option>`).join('')}
                        </select>
                    </div>
                    <canvas id="curvesCanvas" width="${SIZE}" height="${SIZE}" style="width:${SIZE}px;height:${SIZE}px;background:rgba(0,0,0,0.35);cursor:crosshair;align-self:center;touch-action:none"></canvas>
                    <div style="font-size:11px;color:var(--text-secondary)">Click to add a point. Drag to adjust.</div>
                    <div class="form-row" style="justify-content:space-between">
                        <span id="curvesInfo" style="font-variant-numeric:tabular-nums"></span>
                        <button class="btn btn-secondary" id="curvesRemove" onclick="CurvesDialog.removeSelected()">Remove Point</button>
                    </div>
                    <div class="form-row" style="justify-content:space-between">
                        <button class="btn btn-secondary" onclick="CurvesDialog.resetChannel()">Reset Curve</button>
                        <label style="display:flex;align-items:center;gap:4px;cursor:pointer">
                            <input type="checkbox" id="curvesPreview" checked onchange="CurvesDialog.preview()"> Preview
                        </label>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="CurvesDialog.cancel()">Cancel</button>
                    <button class="btn btn-primary" onclick="CurvesDialog.commit()">OK</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
        const canvas = el('curvesCanvas');
        canvas.addEventListener('pointerdown', (e) => { canvas.setPointerCapture(e.pointerId); pointer(e, true); });
        canvas.addEventListener('pointermove', (e) => { if (dragging !== null) pointer(e, false); });
        canvas.addEventListener('pointerup', () => { dragging = null; });
        canvas.addEventListener('dblclick', () => removeSelected());
    }

    function curvePoint(e) {
        const r = el('curvesCanvas').getBoundingClientRect();
        return {
            x: Math.min(255, Math.max(0, (e.clientX - r.left) / r.width * 255)),
            y: Math.min(255, Math.max(0, 255 - (e.clientY - r.top) / r.height * 255))
        };
    }

    function pointer(e, isDown) {
        const { x, y } = curvePoint(e);
        if (isDown) {
            const hit = settings.hitTest(x, y);
            dragging = hit >= 0 ? hit : settings.addPoint(Math.round(x), Math.round(y));
            if (dragging < 0) dragging = null;
        }
        if (dragging === null) return;
        selected = dragging;
        settings.movePoint(dragging, Math.round(x), Math.round(y));
        draw();
        preview();
    }

    function draw() {
        const canvas = el('curvesCanvas');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, SIZE, SIZE);
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i <= 4; i++) {
            const f = Math.round(i / 4 * (SIZE - 1)) + 0.5;
            ctx.moveTo(f, 0); ctx.lineTo(f, SIZE);
            ctx.moveTo(0, f); ctx.lineTo(SIZE, f);
        }
        ctx.stroke();
        const colors = ['#ffffff', '#ff5555', '#55dd55', '#5599ff'];
        ctx.strokeStyle = colors[settings.channel];
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 0; x <= 255; x++) {
            const px = x / 255 * SIZE, py = (1 - settings.value(x) / 255) * SIZE;
            if (x === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
        settings.channels[settings.channel].forEach((p, i) => {
            ctx.fillStyle = i === selected ? '#0078d4' : '#ffffff';
            ctx.beginPath();
            ctx.arc(p.x / 255 * SIZE, (1 - p.y / 255) * SIZE, 4, 0, Math.PI * 2);
            ctx.fill();
        });
        const points = settings.channels[settings.channel];
        const p = selected !== null ? points[selected] : null;
        el('curvesInfo').textContent = p ? `Input ${Math.round(p.x)} · Output ${Math.round(p.y)}` : '';
        el('curvesRemove').disabled = !(selected > 0 && selected < points.length - 1);
    }

    function restoreOriginal() {
        if (!session) return;
        session.layer.ctx.putImageData(session.original, 0, 0);
    }

    function preview() {
        if (!session) return;
        if (el('curvesPreview').checked && !settings.isIdentity) {
            const out = session.layer.ctx.createImageData(session.original.width, session.original.height);
            settings.applyTo(session.original, out);
            session.layer.ctx.putImageData(out, 0, 0);
        } else {
            restoreOriginal();
        }
        engine.render();
    }

    const CurvesDialog = {
        open() {
            const layer = engine.getActiveLayer();
            if (!layer || !layer.ctx || layer.isGroup) {
                engine.notifyStatus('Select a pixel layer to adjust with Curves.');
                return false;
            }
            build();
            settings = new CurvesSettings();
            selected = null;
            dragging = null;
            session = { layer, original: layer.ctx.getImageData(0, 0, layer.width, layer.height) };
            el('curvesChannel').value = '0';
            el('curvesPreview').checked = true;
            draw();
            openModal('modalCurves');
            return true;
        },
        setChannel(index) { settings.channel = index; selected = null; dragging = null; draw(); },
        removeSelected() {
            if (selected !== null && settings.removePoint(selected)) { selected = null; draw(); preview(); }
        },
        resetChannel() { settings.reset(); selected = null; draw(); preview(); },
        preview,
        commit() {
            if (!session) return;
            restoreOriginal();
            if (!settings.isIdentity) engine.applyCurvesSettings(settings);
            else engine.render();
            session = null;
            closeModal('modalCurves');
        },
        cancel() {
            restoreOriginal();
            session = null;
            engine.render();
            closeModal('modalCurves');
        },
        // For tests: the live settings
        get settings() { return settings; }
    };
    window.CurvesDialog = CurvesDialog;
})();
