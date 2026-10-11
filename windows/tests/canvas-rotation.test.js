const { describe, it } = require('node:test');
const assert = require('node:assert');
const CompositorEngine = require('../src/engine');

describe('Canvas Viewport Rotation Pipeline (Mac CanvasRotationTests Parity)', () => {
    it('Setting canvas rotation normalizes angle into [-180, 180] range', () => {
        const engine = CompositorEngine.createHeadless(400, 300);
        assert.equal(engine.getCanvasRotation(), 0);

        engine.setCanvasRotation(45);
        assert.equal(engine.getCanvasRotation(), 45);

        engine.setCanvasRotation(270);
        // 270 normalizes to -90
        assert.equal(engine.getCanvasRotation(), -90);

        engine.setCanvasRotation(400);
        // 400 normalizes to 40
        assert.equal(engine.getCanvasRotation(), 40);
    });

    it('Angles within 5 degrees snap to cardinal directions (0, 90, 180, -90)', () => {
        const engine = CompositorEngine.createHeadless(400, 300);

        engine.setCanvasRotation(3);
        assert.equal(engine.getCanvasRotation(), 0, 'Snapped 3 to 0');

        engine.setCanvasRotation(88);
        assert.equal(engine.getCanvasRotation(), 90, 'Snapped 88 to 90');

        engine.setCanvasRotation(-92);
        assert.equal(engine.getCanvasRotation(), -90, 'Snapped -92 to -90');

        engine.setCanvasRotation(178);
        assert.equal(engine.getCanvasRotation(), 180, 'Snapped 178 to 180');
    });

    it('Reset canvas rotation restores viewport angle to 0 without affecting layers', () => {
        const engine = CompositorEngine.createHeadless(400, 300);
        const layer = engine.createLayer('TestLayer', 200, 200);
        layer.x = 50;
        layer.y = 50;

        engine.setCanvasRotation(65);
        assert.equal(engine.getCanvasRotation(), 65);

        engine.resetCanvasRotation();
        assert.equal(engine.getCanvasRotation(), 0);
        assert.equal(layer.x, 50);
        assert.equal(layer.y, 50);
    });
});
