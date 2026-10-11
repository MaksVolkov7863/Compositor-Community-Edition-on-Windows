const { describe, it } = require('node:test');
const assert = require('node:assert');
const CompositorEngine = require('../src/engine');

describe('Layer Effects Resilience Pipeline (Mac LayerEffectsSurviveTests Parity)', () => {
    it('Layer effects survive layer duplication and undo/redo cycles', () => {
        const engine = CompositorEngine.createHeadless(200, 200);
        const layer = engine.getActiveLayer();

        engine.setInnerGlow(layer.id, { enabled: true, size: 12, opacity: 0.8 });
        engine.setColorOverlay(layer.id, { enabled: true, opacity: 0.5, red: 1, green: 0, blue: 0 });

        assert.ok(layer.effects.innerGlow);
        assert.ok(layer.effects.colorOverlay);

        const dup = engine.duplicateLayer(layer.id);
        assert.ok(dup);
        assert.ok(dup.effects.innerGlow);
        assert.equal(dup.effects.innerGlow.size, 12);
        assert.ok(dup.effects.colorOverlay);
        assert.equal(dup.effects.colorOverlay.opacity, 0.5);

        // Undo duplication
        engine.undo();
        assert.equal(engine.layers.length, 1);
        assert.ok(engine.layers[0].effects.innerGlow);
        assert.ok(engine.layers[0].effects.colorOverlay);
    });

    it('Layer effects survive adding and painting masks onto layer', () => {
        const engine = CompositorEngine.createHeadless(150, 150);
        const layer = engine.addLayer('FXLayer', 150, 150);

        engine.setColorOverlay(layer.id, { enabled: true, opacity: 0.9, red: 0, green: 0, blue: 1 });
        assert.ok(layer.effects.colorOverlay);

        // Add mask
        engine.addLayerMask(layer.id);
        assert.ok(layer.hasMask);
        assert.ok(layer.effects.colorOverlay, 'Effects preserved after adding mask');

        // Paint onto mask
        const mCtx = layer.maskCanvas.getContext('2d');
        mCtx.fillStyle = '#000000';
        mCtx.fillRect(0, 0, 50, 50);

        engine.render();
        assert.ok(layer.effects.colorOverlay, 'Effects preserved after painting mask');
    });
});
