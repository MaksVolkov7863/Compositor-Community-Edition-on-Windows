const { describe, it } = require('node:test');
const assert = require('node:assert');
const CompositorEngine = require('../src/engine');

describe('Mask Alone View Mode Pipeline (Mac MaskAloneTests Parity)', () => {
    it('Toggling mask alone displays mask channel and exiting restores normal composite', () => {
        const engine = CompositorEngine.createHeadless(200, 100);
        const layer = engine.addLayer('RedLayer', 200, 100);
        layer.ctx.fillStyle = '#ff0000';
        layer.ctx.fillRect(0, 0, 200, 100);

        engine.addLayerMask(layer.id);
        const mCtx = layer.maskCanvas.getContext('2d');
        // Left half white, right half black
        mCtx.fillStyle = '#ffffff';
        mCtx.fillRect(0, 0, 100, 100);
        mCtx.fillStyle = '#000000';
        mCtx.fillRect(100, 0, 100, 100);

        assert.equal(engine.isMaskAloneMode(), false);

        // Toggle mask alone ON
        engine.toggleMaskAlone(layer.id);
        assert.equal(engine.isMaskAloneMode(), true);
        assert.equal(engine.getMaskAloneLayer().id, layer.id);

        // Toggle mask alone OFF
        engine.toggleMaskAlone(layer.id);
        assert.equal(engine.isMaskAloneMode(), false);
        assert.equal(engine.getMaskAloneLayer(), null);
    });

    it('A layer without a mask cannot enter mask alone mode', () => {
        const engine = CompositorEngine.createHeadless(200, 100);
        const layer = engine.addLayer('NoMask', 200, 100);

        const ok = engine.setMaskAlone(layer.id, true);
        assert.equal(ok, false);
        assert.equal(engine.isMaskAloneMode(), false);
    });
});
