const { describe, it } = require('node:test');
const assert = require('node:assert');
const { unitToPixels, pixelsToUnitText } = require('../src/engine/units');

describe('Engine Submodule: Units & Physical Conversions', () => {
    it('unitToPixels converts inches, mm, cm and pixels to pixel counts', () => {
        assert.equal(unitToPixels(100, 'pixels', 72), 100);
        assert.equal(unitToPixels(1, 'inches', 72), 72);
        assert.equal(unitToPixels(2, 'inches', 300), 600);
        assert.equal(unitToPixels(25.4, 'mm', 72), 72);
        assert.equal(unitToPixels(2.54, 'cm', 72), 72);
        assert.equal(unitToPixels(-5, 'pixels', 72), null, 'Negative pixels invalid');
        assert.equal(unitToPixels('abc', 'pixels', 72), null, 'Non-numeric invalid');
    });

    it('pixelsToUnitText formats pixels back into user-friendly unit strings', () => {
        assert.equal(pixelsToUnitText(72, 'inches', 72), '1');
        assert.equal(pixelsToUnitText(36, 'inches', 72), '0.5');
        assert.equal(pixelsToUnitText(100, 'pixels', 72), '100');
    });
});
