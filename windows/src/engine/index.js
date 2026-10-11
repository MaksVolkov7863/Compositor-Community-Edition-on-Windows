/**
 * Compositor Engine Submodules Index
 */

const { createMockCanvas, initHeadlessPolyfills } = require('./mock-canvas');
const { BLEND_MODES, mapBlendMode } = require('./blend-modes');
const { applyDither, applyScanlines, applyVignette, applySharpen, applyBloomGlow, applyBlurBrush } = require('./filters');
const { normalizeRotation, snappedResize, cropLayerToCanvas } = require('./transform');
const { validateOuterGlow, validateInnerGlow, validateColorOverlay } = require('./layer-effects');
const { unitToPixels, pixelsToUnitText } = require('./units');

module.exports = {
    createMockCanvas,
    initHeadlessPolyfills,
    BLEND_MODES,
    mapBlendMode,
    applyDither,
    applyScanlines,
    applyVignette,
    applySharpen,
    applyBloomGlow,
    applyBlurBrush,
    normalizeRotation,
    snappedResize,
    cropLayerToCanvas,
    validateOuterGlow,
    validateInnerGlow,
    validateColorOverlay,
    unitToPixels,
    pixelsToUnitText
};
