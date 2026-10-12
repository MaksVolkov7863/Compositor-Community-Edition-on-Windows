/**
 * The Navigator, after the macOS NavigatorMinimap: a thumbnail of the whole document in the
 * canvas's top right corner, shown from 300% zoom (or always, when turned on from the View
 * menu), with a box around what the canvas shows. Clicking or dragging in it moves the view.
 * The picture is redrawn a moment after edits settle, from DownsampleCache's box-filtered levels.
 */
(function () {
    const LARGEST = { width: 126, height: 90 };
    let box = null, picture = null, frame = null;
    let pinned = false;
    let redrawTimer = null;

    function el(id) { return document.getElementById(id); }

    function sizeFor(doc) {
        if (!doc.width || !doc.height) return { width: 0, height: 0 };
        const scale = Math.min(LARGEST.width / doc.width, LARGEST.height / doc.height);
        return { width: Math.round(doc.width * scale), height: Math.round(doc.height * scale) };
    }

    function build() {
        if (box) return;
        box = document.createElement('div');
        box.id = 'navigatorMinimap';
        box.title = 'Navigator: click or drag to move the view';
        box.style.cssText = 'position:absolute;top:28px;right:12px;z-index:20;display:none;background:#1c1c1c;border:1px solid rgba(255,255,255,0.25);border-radius:4px;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,0.4);cursor:default';
        picture = document.createElement('canvas');
        picture.style.cssText = 'display:block;width:100%;height:100%';
        frame = document.createElement('div');
        frame.style.cssText = 'position:absolute;border:2.5px solid #0078d4;pointer-events:none;box-sizing:border-box';
        box.appendChild(picture);
        box.appendChild(frame);
        el('viewport').appendChild(box);
        let dragging = false;
        const move = (e) => {
            const r = box.getBoundingClientRect();
            const geometry = new NavigatorGeometry({ width: engine.width, height: engine.height }, { width: r.width, height: r.height });
            const p = geometry.documentPoint({ x: e.clientX - r.left, y: e.clientY - r.top });
            Navigator.centerOn(p);
        };
        box.addEventListener('mousedown', (e) => { e.stopPropagation(); e.preventDefault(); dragging = true; move(e); });
        window.addEventListener('mousemove', (e) => { if (dragging) move(e); });
        window.addEventListener('mouseup', () => { dragging = false; });
    }

    function visibleDocumentRect() {
        const viewport = el('viewport');
        const z = engine.viewport.zoom;
        return { x: -engine.viewport.panX / z, y: -engine.viewport.panY / z, width: viewport.clientWidth / z, height: viewport.clientHeight / z };
    }

    function intersect(a, b) {
        const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y);
        const r = Math.min(a.x + a.width, b.x + b.width), btm = Math.min(a.y + a.height, b.y + b.height);
        return r > x && btm > y ? { x, y, width: r - x, height: btm - y } : null;
    }

    function drawPicture() {
        const size = sizeFor(engine);
        const dpr = window.devicePixelRatio || 1;
        picture.width = Math.max(1, Math.round(size.width * dpr));
        picture.height = Math.max(1, Math.round(size.height * dpr));
        const ctx = picture.getContext('2d');
        const factor = picture.width / engine.width;
        const level = DownsampleCache.level(factor);
        let source = engine.canvas;
        if (level > 0) {
            // Halve in steps with box averaging, so a large document doesn't alias into noise
            const pixels = engine.ctx.getImageData(0, 0, engine.width, engine.height).data;
            let img = { width: engine.width, height: engine.height, pixels };
            for (let i = 0; i < level; i++) img = DownsampleCache.halvePixels(img.pixels, img.width, img.height);
            const tmp = document.createElement('canvas');
            tmp.width = img.width; tmp.height = img.height;
            tmp.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(img.pixels), img.width, img.height), 0, 0);
            source = tmp;
        }
        ctx.imageSmoothingQuality = 'medium';
        ctx.clearRect(0, 0, picture.width, picture.height);
        ctx.drawImage(source, 0, 0, picture.width, picture.height);
    }

    const Navigator = {
        get isShown() { return !!box && box.style.display !== 'none'; },
        get pinned() { return pinned; },
        toggle() { pinned = !pinned; Navigator.update(); return pinned; },
        centerOn(point) {
            const viewport = el('viewport');
            const z = engine.viewport.zoom;
            engine.viewport.panX = viewport.clientWidth / 2 - point.x * z;
            engine.viewport.panY = viewport.clientHeight / 2 - point.y * z;
            updateCanvasTransform();
        },
        update() {
            build();
            const shown = pinned || NavigatorGeometry.isVisible(engine.viewport.zoom);
            box.style.display = shown ? 'block' : 'none';
            if (!shown) return;
            const size = sizeFor(engine);
            box.style.width = size.width + 'px';
            box.style.height = size.height + 'px';
            const geometry = new NavigatorGeometry({ width: engine.width, height: engine.height }, size);
            const visible = intersect(visibleDocumentRect(), { x: 0, y: 0, width: engine.width, height: engine.height });
            if (visible) {
                const r = geometry.thumbnailRect(visible);
                frame.style.display = 'block';
                frame.style.left = r.x + 'px';
                frame.style.top = r.y + 'px';
                frame.style.width = Math.max(3, r.width) + 'px';
                frame.style.height = Math.max(3, r.height) + 'px';
            } else {
                frame.style.display = 'none';
            }
            Navigator.schedulePicture(0);
        },
        // Edits settle first, so a stroke redraws the picture once, afterwards
        schedulePicture(delay = 250) {
            if (!Navigator.isShown) return;
            clearTimeout(redrawTimer);
            redrawTimer = setTimeout(drawPicture, delay);
        }
    };
    window.NavigatorPanel = Navigator;
})();
