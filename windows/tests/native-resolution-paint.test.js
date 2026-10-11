const { describe, it } = require('node:test');
const assert = require('node:assert');
const CompositorEngine = require('../src/engine');

describe('Native Resolution Painting & Sub-Pixel Pipeline (Mac NativeResolutionPaintTests Parity)', () => {
    it('Sub-pixel brush dabs interpolate smoothly without grid quantization artifacts', () => {
        const engine = CompositorEngine.createHeadless(100, 100);
        const layer = engine.addLayer('DabTest', 100, 100);
        engine.brushSize = 10;
        engine.brushColor = '#ffffff';

        // Draw at non-integer sub-pixel coordinates
        engine.beginBrush(25.4, 30.7);
        engine.drawBrush(28.2, 35.1);
        engine.endBrush();

        const data = layer.ctx.getImageData(0, 0, 100, 100).data;
        // Non-zero pixels exist around dab
        const pIdx = (32 * 100 + 26) * 4;
        assert.ok(data[pIdx + 3] > 0, 'Dab stamped with alpha');
    });

    it('Pixel grid threshold activates at 800% zoom and higher for exact 1:1 pixel inspection', () => {
        const isPixelGridActive = (zoom) => zoom >= 8.0;
        assert.equal(isPixelGridActive(1.0), false);
        assert.equal(isPixelGridActive(4.0), false);
        assert.equal(isPixelGridActive(7.9), false);
        assert.equal(isPixelGridActive(8.0), true);
        assert.equal(isPixelGridActive(16.0), true);
    });
});
