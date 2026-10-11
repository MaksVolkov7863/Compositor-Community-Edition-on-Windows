/**
 * Blend Modes & Compositing Math
 * Photoshop-compatible blend mode definitions and canvas mapping.
 */

const BLEND_MODES = [
    'Normal',
    'Multiply',
    'Screen',
    'Overlay',
    'Darken',
    'Lighten',
    'Color Dodge',
    'Color Burn',
    'Difference',
    'Soft Light',
    'Hard Light'
];

function mapBlendMode(mode) {
    switch (mode) {
        case 'Multiply': return 'multiply';
        case 'Screen': return 'screen';
        case 'Overlay': return 'overlay';
        case 'Darken': return 'darken';
        case 'Lighten': return 'lighten';
        case 'Color Dodge': return 'color-dodge';
        case 'Color Burn': return 'color-burn';
        case 'Hard Light': return 'hard-light';
        case 'Soft Light': return 'soft-light';
        case 'Difference': return 'difference';
        case 'Exclusion': return 'exclusion';
        case 'Hue': return 'hue';
        case 'Saturation': return 'saturation';
        case 'Color': return 'color';
        case 'Luminosity': return 'luminosity';
        case 'Normal':
        default:
            return 'source-over';
    }
}

module.exports = {
    BLEND_MODES,
    mapBlendMode
};
