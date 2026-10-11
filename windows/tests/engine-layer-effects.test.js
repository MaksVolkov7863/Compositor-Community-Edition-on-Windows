const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
    validateOuterGlow,
    validateInnerGlow,
    validateColorOverlay
} = require('../src/engine/layer-effects');

describe('Engine Submodule: Layer Effects Validation', () => {
    it('validateColorOverlay validates opacity and RGB channels', () => {
        assert.ok(validateColorOverlay({ enabled: true, opacity: 0.8, red: 1, green: 0, blue: 0 }));
        assert.equal(validateColorOverlay({ opacity: 1.5 }), false);
        assert.equal(validateColorOverlay({ opacity: -0.2 }), false);
        assert.equal(validateColorOverlay({ red: 2.5 }), false);
        assert.equal(validateColorOverlay('string'), false);
    });

    it('validateInnerGlow checks size bounds and colors', () => {
        assert.ok(validateInnerGlow({ size: 10, opacity: 0.5, red: 1, green: 1, blue: 1 }));
        assert.equal(validateInnerGlow({ size: -1 }), false);
        assert.equal(validateInnerGlow({ size: 600 }), false, 'Exceeds 500 max');
        assert.equal(validateInnerGlow({ opacity: 2.0 }), false);
    });

    it('validateOuterGlow validates parameters', () => {
        assert.ok(validateOuterGlow({ size: 15, opacity: 0.9, red: 0, green: 1, blue: 0 }));
        assert.equal(validateOuterGlow({ size: -5 }), false);
        assert.equal(validateOuterGlow({ opacity: -1 }), false);
    });
});
