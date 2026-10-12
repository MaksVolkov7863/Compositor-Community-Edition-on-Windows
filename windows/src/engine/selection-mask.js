/**
 * Selection Masks
 * Every selection (marquee, lasso, wand, subject, inverse) carries a document-sized 0..255 mask,
 * so Feather, Expand and Contract work the same whatever made the selection.
 */
(function (root) {

// Even-odd fill of a closed polygon, sampled at pixel centers.
function rasterizePolygon(points, width, height) {
    const mask = new Uint8Array(width * height);
    if (!points || points.length < 3) return mask;
    const n = points.length;
    const xs = [];
    for (let y = 0; y < height; y++) {
        const cy = y + 0.5;
        xs.length = 0;
        for (let i = 0, j = n - 1; i < n; j = i++) {
            const a = points[i], b = points[j];
            if ((a.y > cy) !== (b.y > cy)) {
                xs.push(a.x + (cy - a.y) * (b.x - a.x) / (b.y - a.y));
            }
        }
        xs.sort((p, q) => p - q);
        for (let k = 0; k + 1 < xs.length; k += 2) {
            const x0 = Math.max(0, Math.ceil(xs[k] - 0.5));
            const x1 = Math.min(width - 1, Math.floor(xs[k + 1] - 0.5));
            for (let x = x0; x <= x1; x++) mask[y * width + x] = 255;
        }
    }
    return mask;
}

function invertMask(mask) {
    const out = new Uint8Array(mask.length);
    for (let i = 0; i < mask.length; i++) out[i] = 255 - mask[i];
    return out;
}

// Bounds of the pixels at or above `threshold`, or null when there are none.
function maskBounds(mask, width, height, threshold = 1) {
    let minX = width, minY = height, maxX = -1, maxY = -1;
    for (let y = 0; y < height; y++) {
        const row = y * width;
        for (let x = 0; x < width; x++) {
            if (mask[row + x] >= threshold) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }
    if (maxX < 0) return null;
    return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

// One separable pass of a sliding box filter; `combine` is 'mean', 'max' or 'min'.
function boxPass(input, width, height, radius, horizontal, combine) {
    const out = new Uint8Array(width * height);
    const lines = horizontal ? height : width;
    const length = horizontal ? width : height;
    const at = (line, i) => horizontal ? line * width + i : i * width + line;
    for (let line = 0; line < lines; line++) {
        if (combine === 'mean') {
            let sum = 0;
            for (let k = -radius; k <= radius; k++) {
                const i = Math.min(length - 1, Math.max(0, k));
                sum += k < 0 || k >= length ? 0 : input[at(line, i)];
            }
            for (let i = 0; i < length; i++) {
                out[at(line, i)] = Math.round(sum / (2 * radius + 1));
                const enter = i + radius + 1, leave = i - radius;
                if (enter < length) sum += input[at(line, enter)];
                if (leave >= 0) sum -= input[at(line, leave)];
            }
        } else {
            const expand = combine === 'max';
            for (let i = 0; i < length; i++) {
                let v = expand ? 0 : 255;
                for (let k = -radius; k <= radius; k++) {
                    const j = i + k;
                    const sample = j >= 0 && j < length ? input[at(line, j)] : 0;
                    v = expand ? (sample > v ? sample : v) : (sample < v ? sample : v);
                }
                out[at(line, i)] = v;
            }
        }
    }
    return out;
}

// Feather: three box passes each way approximate a Gaussian of the given radius.
function featherMask(mask, width, height, radius) {
    const r = Math.max(1, Math.round(radius / 3));
    let m = mask;
    for (let pass = 0; pass < 3; pass++) {
        m = boxPass(boxPass(m, width, height, r, true, 'mean'), width, height, r, false, 'mean');
    }
    return m;
}

// Expand (radius > 0) or contract (radius < 0) with a square structuring element.
function growMask(mask, width, height, radius) {
    const r = Math.round(Math.abs(radius));
    if (r === 0) return Uint8Array.from(mask);
    const op = radius > 0 ? 'max' : 'min';
    return boxPass(boxPass(mask, width, height, r, true, op), width, height, r, false, op);
}

const api = { rasterizePolygon, invertMask, maskBounds, featherMask, growMask };

// CommonJS for Node tests; a global registry when loaded with a <script> tag in the renderer.
if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
} else {
    root.CompositorEngineModules = Object.assign(root.CompositorEngineModules || {}, api);
}
})(typeof globalThis !== 'undefined' ? globalThis : this);
