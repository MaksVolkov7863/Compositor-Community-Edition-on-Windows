/**
 * Layout Grid (View > Show Grid, View > Grid Settings…), after the macOS LayoutGrid and
 * GridAppearance: major lines every `spacing` pixels split into `subdivisions`, drawn over the
 * canvas in screen space so lines stay one device pixel at any zoom. Subdivisions are dotted and
 * fainter, and hidden once they would be closer than 4 screen pixels.
 */
(function (root) {

const SPACING_RANGE = [2, 4096];
const SUBDIVISION_RANGE = [1, 64];
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

class LayoutGrid {
    constructor(spacing = 64, subdivisions = 8) {
        this.spacing = clamp(Math.round(Number(spacing) || 64), SPACING_RANGE[0], SPACING_RANGE[1]);
        this.subdivisions = clamp(Math.round(Number(subdivisions) || 8), SUBDIVISION_RANGE[0], Math.min(SUBDIVISION_RANGE[1], this.spacing));
    }

    get step() { return this.spacing / this.subdivisions; }

    // Every line along a document edge, subdivisions included, in whole pixels; counted from
    // the origin so an uneven step doesn't drift off the majors.
    lines(length) {
        if (!(length >= 0)) return [0];
        const count = Math.floor(length / this.step + 0.001);
        const out = [];
        for (let i = 0; i <= count; i++) out.push(Math.round(i * this.step));
        return out;
    }

    isMajor(value) {
        return Math.abs(Math.round(value) % this.spacing) < 0.001;
    }
}

const GRID_PRESETS = {
    'Light Gray': [0.7, 0.7, 0.7], 'Light Blue': [0.29, 0.78, 1], 'Light Red': [1, 0.4, 0.4],
    'Green': [0.25, 0.8, 0.25], 'Medium Blue': [0.2, 0.4, 1], 'Yellow': [1, 1, 0],
    'Magenta': [1, 0, 1], 'Cyan': [0, 1, 1], 'Black': [0, 0, 0]
};
const GRID_STYLES = { 'Lines': [], 'Dashed Lines': [4, 3], 'Dots': [1, 2] };

class GridAppearance {
    constructor(options = {}) {
        this.preset = GRID_PRESETS[options.preset] ? options.preset : 'Light Gray';
        this.style = GRID_STYLES[options.style] ? options.style : 'Lines';
        this.opacity = clamp(Math.round(Number(options.opacity) || 45), 1, 100);
    }
    get rgb() { return GRID_PRESETS[this.preset].map(c => Math.round(c * 255)); }
    get majorAlpha() { return this.opacity / 100; }
    get subdivisionAlpha() { return this.majorAlpha * 28 / 45; }
    color(alpha) { const [r, g, b] = this.rgb; return `rgba(${r}, ${g}, ${b}, ${alpha})`; }
}

/**
 * Draws the grid into a screen-space 2D context.
 * view: { originX, originY, scale } maps document (x, y) to screen (originX + x*scale, originY + y*scale).
 * clip: optional { width, height } of the screen canvas, to skip lines off screen.
 */
function drawLayoutGrid(ctx, docWidth, docHeight, grid, appearance, view, clip = null) {
    const { originX, originY, scale } = view;
    const toX = (x) => Math.round(originX + x * scale) + 0.5;
    const toY = (y) => Math.round(originY + y * scale) + 0.5;
    const left = toX(0), top = toY(0), right = toX(docWidth), bottom = toY(docHeight);
    const visibleX = (sx) => !clip || (sx >= 0 && sx <= clip.width);
    const visibleY = (sy) => !clip || (sy >= 0 && sy <= clip.height);
    const xs = grid.lines(docWidth), ys = grid.lines(docHeight);
    let drawn = 0;
    ctx.save();
    ctx.lineWidth = 1;
    if (grid.step * scale >= 4) {
        ctx.setLineDash([1, 2]);
        ctx.strokeStyle = appearance.color(appearance.subdivisionAlpha);
        ctx.beginPath();
        for (const x of xs) if (!grid.isMajor(x) && visibleX(toX(x))) { ctx.moveTo(toX(x), top); ctx.lineTo(toX(x), bottom); drawn++; }
        for (const y of ys) if (!grid.isMajor(y) && visibleY(toY(y))) { ctx.moveTo(left, toY(y)); ctx.lineTo(right, toY(y)); drawn++; }
        ctx.stroke();
    }
    ctx.setLineDash(GRID_STYLES[appearance.style]);
    ctx.strokeStyle = appearance.color(appearance.majorAlpha);
    ctx.beginPath();
    for (const x of xs) if (grid.isMajor(x) && visibleX(toX(x))) { ctx.moveTo(toX(x), top); ctx.lineTo(toX(x), bottom); drawn++; }
    for (const y of ys) if (grid.isMajor(y) && visibleY(toY(y))) { ctx.moveTo(left, toY(y)); ctx.lineTo(right, toY(y)); drawn++; }
    ctx.stroke();
    ctx.restore();
    return drawn;
}

const api = { LayoutGrid, GridAppearance, GRID_PRESETS, GRID_STYLES, drawLayoutGrid };
if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
} else {
    Object.assign(root, api);
}
})(typeof globalThis !== 'undefined' ? globalThis : this);
