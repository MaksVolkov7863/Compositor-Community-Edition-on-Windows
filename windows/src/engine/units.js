/**
 * Canvas Measurement Units & Physical DPI Conversions
 * Inches, millimeters, centimeters, pixels conversions.
 */
(function (root) {

function unitToPixels(value, unit = 'pixels', resolution = 72) {
    const num = parseFloat(String(value).replace(',', '.'));
    if (isNaN(num) || num <= 0) return null;

    switch (unit.toLowerCase()) {
        case 'inches':
        case 'in':
            const inPx = Math.round(num * resolution);
            return inPx > 30000 ? null : inPx;
        case 'millimeters':
        case 'mm':
            const mmPx = Math.round((num / 25.4) * resolution);
            return mmPx > 30000 ? null : mmPx;
        case 'centimeters':
        case 'cm':
            const cmPx = Math.round((num / 2.54) * resolution);
            return cmPx > 30000 ? null : cmPx;
        case 'pixels':
        case 'px':
        default:
            if (String(value).includes('.') || String(value).includes(',')) return null;
            return num > 30000 ? null : Math.round(num);
    }
}

function pixelsToUnitText(pixels, unit = 'pixels', resolution = 72) {
    const fmt = (val) => {
        const str = val.toFixed(2);
        return str.replace(/\.00$/, '').replace(/(\.[1-9])0$/, '$1');
    };
    switch (unit.toLowerCase()) {
        case 'inches':
        case 'in':
            return fmt(pixels / resolution);
        case 'millimeters':
        case 'mm':
            return fmt((pixels / resolution) * 25.4);
        case 'centimeters':
        case 'cm':
            return fmt((pixels / resolution) * 2.54);
        case 'pixels':
        case 'px':
        default:
            return String(Math.round(pixels));
    }
}

const api = {
    unitToPixels,
    pixelsToUnitText
};

// CommonJS for Node tests; a global registry when loaded with a <script> tag in the renderer.
if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
} else {
    root.CompositorEngineModules = Object.assign(root.CompositorEngineModules || {}, api);
}
})(typeof globalThis !== 'undefined' ? globalThis : this);
