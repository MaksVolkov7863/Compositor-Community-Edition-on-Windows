/**
 * Compositor Image Finishing & Retro Filter Pipelines
 * Vignette, Sharpen, Bloom/Glow, Scanlines, Dither, Blur Brush.
 */

function applyDither(layer, methodOrOptions = 'bayer4', opt = {}) {
    if (!layer || !layer.canvas) return false;
    const method = typeof methodOrOptions === 'string' ? methodOrOptions : (methodOrOptions.method || 'bayer4');
    const options = typeof methodOrOptions === 'object' ? methodOrOptions : opt;

    const ctx = layer.ctx || layer.canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, layer.width, layer.height);
    const data = imgData.data;
    const w = layer.width, h = layer.height;

    const chunky = Math.max(1, parseInt(options.chunky) || 1);
    const palette = options.palette || 'mono';

    // 1. Chunky pixel downsampling if chunky > 1
    if (chunky > 1) {
        for (let y = 0; y < h; y += chunky) {
            for (let x = 0; x < w; x += chunky) {
                const i = (y * w + x) * 4;
                const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
                for (let cy = 0; cy < chunky && (y + cy) < h; cy++) {
                    for (let cx = 0; cx < chunky && (x + cx) < w; cx++) {
                        const idx = ((y + cy) * w + (x + cx)) * 4;
                        data[idx] = r;
                        data[idx + 1] = g;
                        data[idx + 2] = b;
                        data[idx + 3] = a;
                    }
                }
            }
        }
    }

    const bayer2 = [[0, 2], [3, 1]].map(row => row.map(v => (v / 4) - 0.5));
    const bayer4 = [
        [ 0,  8,  2, 10],
        [12,  4, 14,  6],
        [ 3, 11,  1,  9],
        [15,  7, 13,  5]
    ].map(row => row.map(v => (v / 16) - 0.5));

    const bayer8 = [
        [ 0, 32,  8, 40,  2, 34, 10, 42],
        [48, 16, 56, 24, 50, 18, 58, 26],
        [12, 44,  4, 36, 14, 46,  6, 38],
        [60, 28, 52, 20, 62, 30, 54, 22],
        [ 3, 35, 11, 43,  1, 33,  9, 41],
        [51, 19, 59, 27, 49, 17, 57, 25],
        [15, 47,  7, 39, 13, 45,  5, 37],
        [63, 31, 55, 23, 61, 29, 53, 21]
    ].map(row => row.map(v => (v / 64) - 0.5));

    if (method.startsWith('bayer')) {
        const matrix = method === 'bayer2' ? bayer2 : (method === 'bayer8' ? bayer8 : bayer4);
        const mSize = matrix.length;
        const spread = options.spread !== undefined ? options.spread : 64;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const i = (y * w + x) * 4;
                if (data[i + 3] === 0) continue;

                const threshold = matrix[y % mSize][x % mSize] * spread;
                for (let c = 0; c < 3; c++) {
                    let val = data[i + c] + threshold;
                    if (palette === 'mono') {
                        val = val >= 128 ? 255 : 0;
                    } else if (palette === 'gray2') {
                        val = Math.round(val / 85) * 85;
                    } else {
                        val = Math.round(val / 64) * 64;
                    }
                    data[i + c] = Math.max(0, Math.min(255, val));
                }
            }
        }
    } else if (method === 'floyd-steinberg' || method === 'atkinson') {
        const isAtkinson = method === 'atkinson';
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const i = (y * w + x) * 4;
                if (data[i + 3] === 0) continue;

                for (let c = 0; c < 3; c++) {
                    const oldVal = data[i + c];
                    const newVal = oldVal >= 128 ? 255 : 0;
                    data[i + c] = newVal;
                    const err = oldVal - newVal;

                    if (isAtkinson) {
                        const diffuse = (dx, dy) => {
                            const nx = x + dx, ny = y + dy;
                            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                                const ni = (ny * w + nx) * 4 + c;
                                data[ni] = Math.max(0, Math.min(255, data[ni] + (err >> 3)));
                            }
                        };
                        diffuse(1, 0); diffuse(2, 0);
                        diffuse(-1, 1); diffuse(0, 1); diffuse(1, 1);
                        diffuse(0, 2);
                    } else {
                        const diffuse = (dx, dy, factor) => {
                            const nx = x + dx, ny = y + dy;
                            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                                const ni = (ny * w + nx) * 4 + c;
                                data[ni] = Math.max(0, Math.min(255, data[ni] + (err * factor / 16)));
                            }
                        };
                        diffuse(1, 0, 7);
                        diffuse(-1, 1, 3);
                        diffuse(0, 1, 5);
                        diffuse(1, 1, 1);
                    }
                }
            }
        }
    }

    ctx.putImageData(imgData, 0, 0);
    return true;
}

function applyScanlines(layer, options = {}) {
    if (!layer || !layer.canvas) return false;
    const ctx = layer.ctx || layer.canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, layer.width, layer.height);
    const data = imgData.data;
    const w = layer.width, h = layer.height;

    const spacing = Math.max(2, parseInt(options.lineSpacing || options.spacing) || 4);
    const lineWidth = Math.max(1, parseInt(options.lineWidth || options.thickness) || 1);
    const intensity = options.intensity !== undefined ? options.intensity : (options.opacity !== undefined ? options.opacity : 0.5);
    const orientation = options.orientation || 'horizontal';
    const glow = options.glow || 0;
    const blackLevel = options.blackLevel || 0;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            if (data[i + 3] === 0) continue;

            const pos = orientation === 'horizontal' ? y : x;
            const bandPos = pos % spacing;
            const isLine = bandPos < lineWidth;

            if (!isLine) {
                const factor = Math.max(0, 1 - intensity * (1 - glow * 0.005));
                data[i] = Math.round(data[i] * factor + blackLevel);
                data[i + 1] = Math.round(data[i] * factor + blackLevel);
                data[i + 2] = Math.round(data[i] * factor + blackLevel);
            } else if (blackLevel > 0) {
                data[i] = Math.min(255, data[i] + blackLevel);
                data[i + 1] = Math.min(255, data[i + 1] + blackLevel);
                data[i + 2] = Math.min(255, data[i + 2] + blackLevel);
            }
        }
    }

    ctx.putImageData(imgData, 0, 0);
    return true;
}

function applyVignette(layer, options = {}) {
    if (!layer || !layer.canvas) return false;
    const ctx = layer.ctx || layer.canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, layer.width, layer.height);
    const data = imgData.data;
    const w = layer.width, h = layer.height;

    const amount = options.amount !== undefined ? options.amount : 0.5;
    const radius = options.radius !== undefined ? options.radius : 0.8;
    const roundness = options.roundness !== undefined ? options.roundness : 1.0;
    const cx = w / 2, cy = h / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy) * radius;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            if (data[i + 3] === 0) continue;

            const dx = (x - cx) * (roundness === 1 ? 1 : (w / h));
            const dy = y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > maxDist * 0.5) {
                const vigFactor = Math.min(1, (dist - maxDist * 0.5) / (maxDist * 0.5));
                const darken = 1 - (vigFactor * amount);
                data[i] = Math.max(0, Math.round(data[i] * darken));
                data[i + 1] = Math.max(0, Math.round(data[i] * darken));
                data[i + 2] = Math.max(0, Math.round(data[i] * darken));
            }
        }
    }

    ctx.putImageData(imgData, 0, 0);
    return true;
}

function applySharpen(layer, amount = 0.5) {
    if (!layer || !layer.canvas) return false;
    const ctx = layer.ctx || layer.canvas.getContext('2d');
    const src = ctx.getImageData(0, 0, layer.width, layer.height);
    const dst = ctx.createImageData(layer.width, layer.height);
    const s = src.data, d = dst.data;
    const w = layer.width, h = layer.height;

    const strength = Math.max(0.1, amount);
    const center = 1 + 4 * strength;
    const edge = -strength;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            d[i + 3] = s[i + 3];
            if (s[i + 3] === 0 || x === 0 || y === 0 || x === w - 1 || y === h - 1) {
                d[i] = s[i]; d[i + 1] = s[i + 1]; d[i + 2] = s[i + 2];
                continue;
            }

            for (let c = 0; c < 3; c++) {
                const top = s[((y - 1) * w + x) * 4 + c];
                const bottom = s[((y + 1) * w + x) * 4 + c];
                const left = s[(y * w + (x - 1)) * 4 + c];
                const right = s[(y * w + (x + 1)) * 4 + c];
                const mid = s[i + c];

                const val = mid * center + (top + bottom + left + right) * edge;
                d[i + c] = Math.max(0, Math.min(255, Math.round(val)));
            }
        }
    }

    ctx.putImageData(dst, 0, 0);
    return true;
}

function applyBloomGlow(layer, options = {}) {
    if (!layer || !layer.canvas) return false;
    const ctx = layer.ctx || layer.canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, layer.width, layer.height);
    const data = imgData.data;

    const threshold = options.threshold !== undefined ? options.threshold : 180;
    const intensity = options.intensity !== undefined ? options.intensity : 0.6;

    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue;
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        if (lum > threshold) {
            const boost = (lum - threshold) * intensity;
            data[i] = Math.min(255, data[i] + boost);
            data[i + 1] = Math.min(255, data[i + 1] + boost);
            data[i + 2] = Math.min(255, data[i + 2] + boost);
        }
    }

    ctx.putImageData(imgData, 0, 0);
    return true;
}

function applyBlurBrush(targetCanvas, layerX, layerY, layerW, layerH, x, y, radius = 20, strength = 0.8) {
    if (!targetCanvas) return false;
    const targetCtx = targetCanvas.getContext('2d');

    const r = Math.max(1, Math.round(radius));
    const lx = Math.round(x - layerX);
    const ly = Math.round(y - layerY);

    const x0 = Math.max(0, lx - r);
    const y0 = Math.max(0, ly - r);
    const x1 = Math.min(layerW, lx + r);
    const y1 = Math.min(layerH, ly + r);
    const bw = x1 - x0;
    const bh = y1 - y0;

    if (bw <= 0 || bh <= 0) return false;

    const patch = targetCtx.getImageData(x0, y0, bw, bh);
    const pData = patch.data;
    const copy = new Uint8Array(pData);

    for (let py = 1; py < bh - 1; py++) {
        for (let px = 1; px < bw - 1; px++) {
            const dx = (x0 + px) - lx;
            const dy = (y0 + py) - ly;
            const distSq = dx * dx + dy * dy;
            if (distSq > r * r) continue;

            const falloff = (1 - Math.sqrt(distSq) / r) * strength;
            const idx = (py * bw + px) * 4;

            for (let c = 0; c < 4; c++) {
                let sum = 0;
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        sum += copy[((py + ky) * bw + (px + kx)) * 4 + c];
                    }
                }
                const avg = sum / 9;
                pData[idx + c] = Math.round(copy[idx + c] * (1 - falloff) + avg * falloff);
            }
        }
    }

    targetCtx.putImageData(patch, x0, y0);
    return true;
}

module.exports = {
    applyDither,
    applyScanlines,
    applyVignette,
    applySharpen,
    applyBloomGlow,
    applyBlurBrush
};
