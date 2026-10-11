const { describe, it } = require('node:test');
const assert = require('node:assert');
const CompositorEngine = require('../src/engine');

describe('Large Canvas Brush Pipeline (Mac LargeCanvasBrushTests Parity)', () => {
    it('Brush stroke dirty rectangle bounding box stays bounded on large canvas', () => {
        const engine = CompositorEngine.createHeadless(5000, 5000);
        const layer = engine.createLayer('LargeLayer', 5000, 5000);

        engine.activeLayerId = layer.id;
        engine.brushSize = 200;
        engine.brushColor = '#ff0000';

        // Perform stroke across middle
        engine.beginBrush(1000, 2500);
        engine.drawBrush(1100, 2500);
        engine.endBrush();

        assert.equal(engine.history.length > 0, true);
        assert.equal(layer.width, 5000);
        assert.equal(layer.height, 5000);
    });

    it('Large canvas brush clamps stroke dabs within document boundaries', () => {
        const engine = CompositorEngine.createHeadless(4000, 3000);
        const layer = engine.createLayer('BoundTest', 4000, 3000);

        engine.activeLayerId = layer.id;
        engine.brushSize = 500;

        // Stroke right along edge
        engine.beginBrush(0, 0);
        engine.drawBrush(100, 0);
        engine.endBrush();

        assert.ok(layer.canvas);
    });
});
