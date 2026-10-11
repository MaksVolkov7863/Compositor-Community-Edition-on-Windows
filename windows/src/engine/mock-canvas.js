/**
 * Headless Mock Canvas for Compositor Engine
 * Provides Node.js CI test automation with 2D context emulation,
 * pixel buffer rasterization, paths, and composite operations.
 */
(function (root) {

function createMockCanvas(w, h) {
    w = Math.max(1, Math.round(w || 1));
    h = Math.max(1, Math.round(h || 1));
    const bufW = Math.min(w, 4096);
    const bufH = Math.min(h, 4096);
    const buffer = new Uint8ClampedArray(bufW * bufH * 4);

    const parseColor = (str) => {
        if (!str) return { r: 255, g: 255, b: 255, a: 255 };
        if (typeof str === 'object' && str !== null) {
            if (str.stops && str.stops.length > 0) {
                return parseColor(str.stops[0].color);
            }
            return { r: 255, g: 255, b: 255, a: 255 };
        }
        if (typeof str !== 'string') return { r: 255, g: 255, b: 255, a: 255 };
        str = str.trim().toLowerCase();
        const namedColors = {
            black: { r: 0, g: 0, b: 0, a: 255 },
            white: { r: 255, g: 255, b: 255, a: 255 },
            transparent: { r: 0, g: 0, b: 0, a: 0 },
            red: { r: 255, g: 0, b: 0, a: 255 },
            green: { r: 0, g: 255, b: 0, a: 255 },
            blue: { r: 0, g: 0, b: 255, a: 255 },
            yellow: { r: 255, g: 255, b: 0, a: 255 },
            cyan: { r: 0, g: 255, b: 255, a: 255 },
            magenta: { r: 255, g: 0, b: 255, a: 255 }
        };
        if (namedColors[str]) return { ...namedColors[str] };
        if (str.startsWith('#')) {
            let hex = str.slice(1);
            if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
            if (hex.length === 6) {
                const num = parseInt(hex, 16);
                return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255, a: 255 };
            } else if (hex.length === 8) {
                const num = parseInt(hex, 16);
                return { r: (num >> 24) & 255, g: (num >> 16) & 255, b: (num >> 8) & 255, a: num & 255 };
            }
        }
        const m = str.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\)/);
        if (m) {
            return {
                r: parseInt(m[1]),
                g: parseInt(m[2]),
                b: parseInt(m[3]),
                a: m[4] !== undefined ? Math.round(parseFloat(m[4]) * 255) : 255
            };
        }
        return { r: 255, g: 255, b: 255, a: 255 };
    };

    let currentPath = null;
    const ctxObj = {
        fillStyle: '#000000',
        strokeStyle: '#000000',
        globalAlpha: 1.0,
        globalCompositeOperation: 'source-over',
        filter: 'none',
        font: '16px Segoe UI',
        textAlign: 'left',
        textBaseline: 'top',
        lineWidth: 1,
        lineDashOffset: 0,

        save: () => {},
        restore: () => {},
        translate: () => {},
        rotate: () => {},
        scale: () => {},
        setLineDash: () => {},

        fillRect: (x, y, rw, rh) => {
            let rx = Math.floor(x);
            let ry = Math.floor(y);
            let rwidth = Math.ceil(rw);
            let rheight = Math.ceil(rh);
            if (rwidth < 0) { rx += rwidth; rwidth = -rwidth; }
            if (rheight < 0) { ry += rheight; rheight = -rheight; }

            const col = parseColor(ctxObj.fillStyle);
            const alpha = Math.round(col.a * ctxObj.globalAlpha);

            for (let py = Math.max(0, ry); py < Math.min(bufH, ry + rheight); py++) {
                for (let px = Math.max(0, rx); px < Math.min(bufW, rx + rwidth); px++) {
                    const idx = (py * bufW + px) * 4;
                    if (ctxObj.globalCompositeOperation === 'destination-out') {
                        const factor = 1 - (col.a / 255) * ctxObj.globalAlpha;
                        buffer[idx + 3] = Math.round(buffer[idx + 3] * factor);
                    } else {
                        buffer[idx] = col.r;
                        buffer[idx + 1] = col.g;
                        buffer[idx + 2] = col.b;
                        buffer[idx + 3] = alpha;
                    }
                }
            }
        },

        clearRect: (x, y, rw, rh) => {
            let rx = Math.floor(x);
            let ry = Math.floor(y);
            let rwidth = Math.ceil(rw);
            let rheight = Math.ceil(rh);
            if (rwidth < 0) { rx += rwidth; rwidth = -rwidth; }
            if (rheight < 0) { ry += rheight; rheight = -rheight; }

            for (let py = Math.max(0, ry); py < Math.min(bufH, ry + rheight); py++) {
                for (let px = Math.max(0, rx); px < Math.min(bufW, rx + rwidth); px++) {
                    const idx = (py * bufW + px) * 4;
                    buffer[idx] = 0; buffer[idx + 1] = 0; buffer[idx + 2] = 0; buffer[idx + 3] = 0;
                }
            }
        },

        beginPath: () => { currentPath = null; },
        rect: (x, y, rw, rh) => { currentPath = { type: 'rect', x, y, rw, rh }; },
        roundRect: (x, y, rw, rh, rad = 0) => { currentPath = { type: 'roundRect', x, y, rw, rh, rad }; },
        ellipse: (cx, cy, rx, ry) => { currentPath = { type: 'ellipse', cx, cy, rx, ry }; },
        arc: (cx, cy, r) => { currentPath = { type: 'ellipse', cx, cy, rx: r, ry: r }; },
        moveTo: () => {},
        lineTo: () => {},
        closePath: () => {},

        fill: () => {
            if (!currentPath) return;
            const col = parseColor(ctxObj.fillStyle);
            const alpha = Math.round(col.a * ctxObj.globalAlpha);
            const isDestOut = ctxObj.globalCompositeOperation === 'destination-out';

            if (currentPath.type === 'rect') {
                ctxObj.fillRect(currentPath.x, currentPath.y, currentPath.rw, currentPath.rh);
            } else if (currentPath.type === 'roundRect') {
                const { x, y, rw, rh, rad } = currentPath;
                const r = Math.min(rad, Math.min(rw, rh) / 2);
                for (let py = Math.max(0, Math.floor(y)); py < Math.min(bufH, Math.ceil(y + rh)); py++) {
                    for (let px = Math.max(0, Math.floor(x)); px < Math.min(bufW, Math.ceil(x + rw)); px++) {
                        let inCorner = false;
                        let cornerDx = 0, cornerDy = 0;
                        if (px < x + r && py < y + r) { inCorner = true; cornerDx = px - (x + r); cornerDy = py - (y + r); }
                        else if (px > x + rw - r && py < y + r) { inCorner = true; cornerDx = px - (x + rw - r); cornerDy = py - (y + r); }
                        else if (px < x + r && py > y + rh - r) { inCorner = true; cornerDx = px - (x + r); cornerDy = py - (y + rh - r); }
                        else if (px > x + rw - r && py > y + rh - r) { inCorner = true; cornerDx = px - (x + rw - r); cornerDy = py - (y + rh - r); }

                        if (inCorner && (cornerDx * cornerDx + cornerDy * cornerDy > r * r)) {
                            continue;
                        }
                        const idx = (py * bufW + px) * 4;
                        if (isDestOut) {
                            buffer[idx + 3] = Math.round(buffer[idx + 3] * (1 - alpha / 255));
                        } else {
                            buffer[idx] = col.r; buffer[idx + 1] = col.g; buffer[idx + 2] = col.b; buffer[idx + 3] = alpha;
                        }
                    }
                }
            } else if (currentPath.type === 'ellipse') {
                const { cx, cy, rx, ry } = currentPath;
                for (let py = Math.max(0, Math.floor(cy - ry)); py <= Math.min(bufH - 1, Math.ceil(cy + ry)); py++) {
                    for (let px = Math.max(0, Math.floor(cx - rx)); px <= Math.min(bufW - 1, Math.ceil(cx + rx)); px++) {
                        const normX = (px - cx) / Math.max(1, rx);
                        const normY = (py - cy) / Math.max(1, ry);
                        if (normX * normX + normY * normY <= 1.0) {
                            const idx = (py * bufW + px) * 4;
                            if (isDestOut) {
                                buffer[idx + 3] = Math.round(buffer[idx + 3] * (1 - alpha / 255));
                            } else {
                                buffer[idx] = col.r; buffer[idx + 1] = col.g; buffer[idx + 2] = col.b; buffer[idx + 3] = alpha;
                            }
                        }
                    }
                }
            }
        },

        stroke: () => {
            if (!currentPath) return;
            const col = parseColor(ctxObj.strokeStyle);
            const alpha = Math.round(col.a * ctxObj.globalAlpha);
            if (currentPath.type === 'rect') {
                const { x, y, rw, rh } = currentPath;
                const lw = Math.max(1, Math.round(ctxObj.lineWidth || 1));
                ctxObj.fillRect(x, y, rw, lw);
                ctxObj.fillRect(x, y + rh - lw, rw, lw);
                ctxObj.fillRect(x, y, lw, rh);
                ctxObj.fillRect(x + rw - lw, y, lw, rh);
            }
        },

        clip: () => {},

        fillText: (text, x, y) => {
            const col = parseColor(ctxObj.fillStyle);
            const alpha = Math.round(col.a * ctxObj.globalAlpha);
            const tw = Math.max(10, Math.min(bufW - x, (text ? text.length : 1) * 12));
            const th = 16;
            for (let py = Math.max(0, Math.floor(y)); py < Math.min(bufH, Math.ceil(y + th)); py++) {
                for (let px = Math.max(0, Math.floor(x)); px < Math.min(bufW, Math.ceil(x + tw)); px++) {
                    const idx = (py * bufW + px) * 4;
                    buffer[idx] = col.r; buffer[idx + 1] = col.g; buffer[idx + 2] = col.b; buffer[idx + 3] = alpha;
                }
            }
        },

        strokeText: () => {},
        measureText: (text) => ({ width: (text ? text.length : 0) * 12, actualBoundingBoxAscent: 12, actualBoundingBoxDescent: 4 }),

        createLinearGradient: () => {
            const stops = [];
            return {
                stops,
                addColorStop: (pos, color) => { stops.push({ pos, color }); }
            };
        },

        createRadialGradient: () => {
            const stops = [];
            return {
                stops,
                addColorStop: (pos, color) => { stops.push({ pos, color }); }
            };
        },

        getImageData: (x = 0, y = 0, gw = w, gh = h) => {
            const clampedW = Math.min(Math.max(1, gw), bufW);
            const clampedH = Math.min(Math.max(1, gh), bufH);
            const sub = new Uint8ClampedArray(clampedW * clampedH * 4);
            for (let py = 0; py < clampedH; py++) {
                for (let px = 0; px < clampedW; px++) {
                    const srcX = x + px;
                    const srcY = y + py;
                    const dstIdx = (py * clampedW + px) * 4;
                    if (srcX >= 0 && srcX < bufW && srcY >= 0 && srcY < bufH) {
                        const srcIdx = (srcY * bufW + srcX) * 4;
                        sub[dstIdx] = buffer[srcIdx];
                        sub[dstIdx + 1] = buffer[srcIdx + 1];
                        sub[dstIdx + 2] = buffer[srcIdx + 2];
                        sub[dstIdx + 3] = buffer[srcIdx + 3];
                    }
                }
            }
            return { data: sub, width: clampedW, height: clampedH };
        },

        createImageData: (wOrImg, hOrNone) => {
            let cw = typeof wOrImg === 'object' && wOrImg !== null ? wOrImg.width : wOrImg;
            let ch = typeof wOrImg === 'object' && wOrImg !== null ? wOrImg.height : hOrNone;
            cw = Math.max(1, Math.round(cw || 1));
            ch = Math.max(1, Math.round(ch || 1));
            return {
                width: cw,
                height: ch,
                data: new Uint8ClampedArray(cw * ch * 4)
            };
        },

        putImageData: (imgData, x = 0, y = 0) => {
            if (!imgData || !imgData.data) return;
            const iw = imgData.width || 0;
            const ih = imgData.height || 0;
            for (let py = 0; py < ih; py++) {
                for (let px = 0; px < iw; px++) {
                    const dstX = x + px;
                    const dstY = y + py;
                    if (dstX >= 0 && dstX < bufW && dstY >= 0 && dstY < bufH) {
                        const srcIdx = (py * iw + px) * 4;
                        const dstIdx = (dstY * bufW + dstX) * 4;
                        buffer[dstIdx] = imgData.data[srcIdx];
                        buffer[dstIdx + 1] = imgData.data[srcIdx + 1];
                        buffer[dstIdx + 2] = imgData.data[srcIdx + 2];
                        buffer[dstIdx + 3] = imgData.data[srcIdx + 3];
                    }
                }
            }
        },

        drawImage: (src, ...args) => {
            if (!src) return;
            let sdata = null, sw = 0, sh = 0;
            if (src.getContext) {
                const sctx = src.getContext('2d');
                sw = src.width;
                sh = src.height;
                const safeW = Math.min(sw, 4096);
                const safeH = Math.min(sh, 4096);
                sdata = sctx.getImageData(0, 0, safeW, safeH).data;
                sw = safeW;
                sh = safeH;
            } else if (src.data) {
                sw = src.width;
                sh = src.height;
                sdata = src.data;
            }
            if (!sdata) return;

            let dx = 0, dy = 0, dw = sw, dh = sh;
            if (args.length === 2) {
                [dx, dy] = args;
            } else if (args.length === 4) {
                [dx, dy, dw, dh] = args;
            } else if (args.length >= 8) {
                dx = args[4]; dy = args[5]; dw = args[6]; dh = args[7];
            }

            const isDestIn = ctxObj.globalCompositeOperation === 'destination-in';
            const isDestOut = ctxObj.globalCompositeOperation === 'destination-out';
            const alpha = ctxObj.globalAlpha !== undefined ? ctxObj.globalAlpha : 1.0;

            for (let py = 0; py < dh; py++) {
                for (let px = 0; px < dw; px++) {
                    const dstX = Math.floor(dx + px);
                    const dstY = Math.floor(dy + py);
                    if (dstX < 0 || dstX >= bufW || dstY < 0 || dstY >= bufH) continue;

                    const srcX = Math.floor((px / dw) * sw);
                    const srcY = Math.floor((py / dh) * sh);
                    if (srcX < 0 || srcX >= sw || srcY < 0 || srcY >= sh) continue;

                    const sIdx = (srcY * sw + srcX) * 4;
                    const dIdx = (dstY * bufW + dstX) * 4;

                    if (isDestIn) {
                        let srcAlpha = (sdata[sIdx + 3] / 255) * alpha;
                        if (sdata[sIdx + 3] === 255 && sdata[sIdx] === sdata[sIdx + 1] && sdata[sIdx] === sdata[sIdx + 2]) {
                            srcAlpha *= (sdata[sIdx] / 255);
                        }
                        buffer[dIdx + 3] = Math.round(buffer[dIdx + 3] * srcAlpha);
                    } else if (isDestOut) {
                        const srcAlpha = (sdata[sIdx + 3] / 255) * alpha;
                        buffer[dIdx + 3] = Math.round(buffer[dIdx + 3] * (1 - srcAlpha));
                    } else {
                        const srcA = (sdata[sIdx + 3] / 255) * alpha;
                        if (srcA <= 0) continue;
                        if (srcA >= 1) {
                            buffer[dIdx] = sdata[sIdx];
                            buffer[dIdx + 1] = sdata[sIdx + 1];
                            buffer[dIdx + 2] = sdata[sIdx + 2];
                            buffer[dIdx + 3] = 255;
                        } else {
                            const dstA = buffer[dIdx + 3] / 255;
                            const outA = srcA + dstA * (1 - srcA);
                            if (outA > 0) {
                                buffer[dIdx] = Math.round((sdata[sIdx] * srcA + buffer[dIdx] * dstA * (1 - srcA)) / outA);
                                buffer[dIdx + 1] = Math.round((sdata[sIdx + 1] * srcA + buffer[dIdx + 1] * dstA * (1 - srcA)) / outA);
                                buffer[dIdx + 2] = Math.round((sdata[sIdx + 2] * srcA + buffer[dIdx + 2] * dstA * (1 - srcA)) / outA);
                                buffer[dIdx + 3] = Math.round(outA * 255);
                            }
                        }
                    }
                }
            }
        }
    };

    return {
        width: w,
        height: h,
        getContext: () => ctxObj,
        toDataURL: (format = 'image/png') => `data:${format};base64,mock`,
        toBlob: (cb, type = 'image/png') => { if (cb) cb({ size: buffer.length, type }); }
    };
}

function initHeadlessPolyfills() {
    if (typeof document === 'undefined') {
        globalThis.document = {
            createElement: (tag) => {
                if (tag === 'canvas') {
                    return createMockCanvas(800, 600);
                }
                return {};
            }
        };
    }
    if (typeof window === 'undefined') {
        globalThis.window = { innerWidth: 1920, innerHeight: 1080 };
    }
    if (typeof requestAnimationFrame === 'undefined') {
        globalThis.requestAnimationFrame = () => {};
    }
    if (typeof Path2D === 'undefined') {
        globalThis.Path2D = class {
            rect() {}
            ellipse() {}
            moveTo() {}
            lineTo() {}
            closePath() {}
            addPath() {}
        };
    }
}

initHeadlessPolyfills();

const api = {
    createMockCanvas,
    initHeadlessPolyfills
};

// CommonJS for Node tests; a global registry when loaded with a <script> tag in the renderer.
if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
} else {
    root.CompositorEngineModules = Object.assign(root.CompositorEngineModules || {}, api);
}
})(typeof globalThis !== 'undefined' ? globalThis : this);
