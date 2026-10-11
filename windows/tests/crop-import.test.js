const { describe, it } = require('node:test');
const assert = require('node:assert');
const CompositorEngine = require('../src/engine');
const { PSDReader, PSDFixture } = require('../src/psd-reader');

describe('Crop Oversized Layers to Canvas Pipeline (Mac CropToCanvasImportTests Parity)', () => {
    it('Fitting document preserves oversized layer pixels when within budget', () => {
        const psdData = PSDFixture.data({
            width: 100,
            height: 100,
            layers: [{ name: 'Overhang', bounds: { x: -20, y: 10, width: 140, height: 80 } }]
        });

        const doc = PSDReader.read(psdData, { remainingPixels: 100000 });
        assert.equal(doc.layers[0].bounds.width, 140);
        assert.equal(doc.layers[0].bounds.x, -20);
        assert.equal(doc.layers[0].croppedToCanvas, false);
    });

    it('cropLayerToCanvas clamps layer coordinates and dimensions to canvas rectangle', () => {
        const engine = CompositorEngine.createHeadless(200, 200);
        const layer = engine.addLayer('Oversized', 300, 250);
        layer.x = -50;
        layer.y = -30;

        assert.equal(layer.width, 300);
        assert.equal(layer.height, 250);

        const ok = engine.cropLayerToCanvas(layer.id);
        assert.ok(ok);

        assert.ok(layer.x >= 0, 'x clamped');
        assert.ok(layer.y >= 0, 'y clamped');
        assert.ok(layer.width <= 200, 'width clamped to canvas bounds');
        assert.ok(layer.height <= 200, 'height clamped to canvas bounds');
        assert.ok(layer.croppedToCanvas);
    });
});
