/**
 * Layer Effects Pipeline
 * Inner Glow, Outer Glow, Color Overlay validation and rendering.
 */

function validateOuterGlow(effect) {
    if (!effect || typeof effect !== 'object') return false;
    if (typeof effect.size !== 'number' || effect.size < 0) return false;
    if (typeof effect.opacity !== 'number' || effect.opacity < 0 || effect.opacity > 1) return false;
    if (effect.red !== undefined && (effect.red < 0 || effect.red > 1)) return false;
    if (effect.green !== undefined && (effect.green < 0 || effect.green > 1)) return false;
    if (effect.blue !== undefined && (effect.blue < 0 || effect.blue > 1)) return false;
    return true;
}

function validateInnerGlow(effect) {
    if (!effect || typeof effect !== 'object') return false;
    if (typeof effect.size !== 'number' || effect.size < 0 || effect.size > 500) return false;
    if (typeof effect.opacity !== 'number' || effect.opacity < 0 || effect.opacity > 1) return false;
    if (effect.red !== undefined && (typeof effect.red !== 'number' || effect.red < 0 || effect.red > 1)) return false;
    if (effect.green !== undefined && (typeof effect.green !== 'number' || effect.green < 0 || effect.green > 1)) return false;
    if (effect.blue !== undefined && (typeof effect.blue !== 'number' || effect.blue < 0 || effect.blue > 1)) return false;
    return true;
}

function validateColorOverlay(effect) {
    if (!effect || typeof effect !== 'object') return false;
    if (effect.opacity !== undefined && (typeof effect.opacity !== 'number' || effect.opacity < 0 || effect.opacity > 1)) return false;
    if (effect.red !== undefined && (typeof effect.red !== 'number' || effect.red < 0 || effect.red > 1)) return false;
    if (effect.green !== undefined && (typeof effect.green !== 'number' || effect.green < 0 || effect.green > 1)) return false;
    if (effect.blue !== undefined && (typeof effect.blue !== 'number' || effect.blue < 0 || effect.blue > 1)) return false;
    return true;
}

module.exports = {
    validateOuterGlow,
    validateInnerGlow,
    validateColorOverlay
};
