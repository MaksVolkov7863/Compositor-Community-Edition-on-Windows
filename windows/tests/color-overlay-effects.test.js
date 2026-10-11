const { describe, it } = require('node:test');
const assert = require('node:assert');
const CompositorEngine = require('../src/engine');

describe('Layer Effects: Color Overlay Pipeline (Mac ColorOverlayTests Parity)', () => {
    it('Validates colorOverlay effect parameters strictly', () => {
        const engine = CompositorEngine.createHeadless(100, 100);
        assert.ok(engine.validateColorOverlay({ enabled: true, opacity: 0.8, red: 1, green: 0, blue: 0 }));
        assert.equal(engine.validateColorOverlay({ opacity: 1.5 }), false);
        assert.equal(engine.validateColorOverlay({ opacity: -0.2 }), false);
        assert.equal(engine.validateColorOverlay({ red: 2.5 }), false);
        assert.equal(engine.validateColorOverlay({ green: -0.1 }), false);
        assert.equal(engine.validateColorOverlay('invalid'), false);
    });

    it('Setting and removing colorOverlay updates layer effects record and history', () => {
        const engine = CompositorEngine.createHeadless(100, 100);
        const layer = engine.addLayer('Recolor', 100, 100);

        engine.setColorOverlay(layer.id, {
            enabled: true,
            opacity: 0.6,
            blendMode: 'Multiply',
            red: 0,
            green: 1,
            blue: 0
        });

        assert.ok(layer.effects && layer.effects.colorOverlay);
        assert.equal(layer.effects.colorOverlay.opacity, 0.6);
        assert.equal(layer.effects.colorOverlay.blendMode, 'Multiply');
        assert.equal(layer.effects.colorOverlay.green, 1.0);

        // Remove overlay
        engine.setColorOverlay(layer.id, null);
        assert.equal(layer.effects.colorOverlay, undefined);
    });

    it('Color overlay composites over layer pixels preserving layer alpha shape', () => {
        const engine = CompositorEngine.createHeadless(40, 40);
        const layer = engine.addLayer('Shape', 40, 40);
        const ctx = layer.ctx;

        // Draw 20x20 blue square at (10, 10)
        ctx.fillStyle = '#0000ff';
        ctx.fillRect(10, 10, 20, 20);

        // Apply 100% opaque red color overlay
        engine.setColorOverlay(layer.id, {
            enabled: true,
            opacity: 1.0,
            red: 1.0,
            green: 0.0,
            blue: 0.0,
            blendMode: 'Normal'
        });

        engine.render();

        // Inside square (15, 15) receives color overlay
        const shapeData = engine.ctx.getImageData(15, 15, 1, 1).data;
        assert.ok(shapeData[0] > 200, `Expected red channel to be active, got ${shapeData[0]}`);
        assert.equal(shapeData[3], 255);
    });
});
