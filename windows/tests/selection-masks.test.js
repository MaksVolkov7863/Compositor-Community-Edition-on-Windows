const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { rasterizePolygon, maskBounds, featherMask, growMask } = require('../src/engine/selection-mask');
const CompositorEngine = require('../src/engine.js');

function lasso(engine, points) {
    engine.lassoPoints = points;
    engine.finalizeLassoSelection();
}

describe('Selection masks for every selection type', () => {
    it('rasterizes a lasso polygon with even-odd fill at pixel centers', () => {
        const mask = rasterizePolygon([{ x: 2, y: 2 }, { x: 8, y: 2 }, { x: 8, y: 6 }, { x: 2, y: 6 }], 10, 10);
        assert.deepEqual(maskBounds(mask, 10, 10), { x: 2, y: 2, width: 6, height: 4 });
    });

    it('a lasso selection carries a mask, so Expand and Contract work on it', () => {
        const engine = CompositorEngine.createHeadless(60, 60);
        lasso(engine, [{ x: 10, y: 10 }, { x: 40, y: 10 }, { x: 25, y: 40 }]);
        assert.ok(engine.selection.mask, 'lasso mask');
        const before = engine.selection.bounds;
        assert.equal(engine.growSelection(3), true);
        const grown = engine.selection.bounds;
        assert.equal(grown.x, before.x - 3);
        assert.equal(grown.width, before.width + 6);
        engine.growSelection(-6);
        assert.ok(engine.selection.bounds.width < before.width);
    });

    it('Feather softens a lasso edge', () => {
        const engine = CompositorEngine.createHeadless(60, 60);
        lasso(engine, [{ x: 10, y: 10 }, { x: 50, y: 10 }, { x: 50, y: 50 }, { x: 10, y: 50 }]);
        assert.equal(engine.featherSelection(6), true);
        const edge = engine.selection.mask[30 * 60 + 10];
        assert.ok(edge > 0 && edge < 255, `soft edge ${edge}`);
        assert.equal(engine.selection.mask[30 * 60 + 30], 255);
    });

    it('Inverse inverts the mask, and Contract then works on the inverse', () => {
        const engine = CompositorEngine.createHeadless(40, 40);
        engine.setRectSelection(10, 10, 20, 20, false);
        engine.invertSelection();
        assert.equal(engine.selection.type, 'inverse');
        assert.equal(engine.selection.mask[0], 255);
        assert.equal(engine.selection.mask[20 * 40 + 20], 0);
        engine.growSelection(-2);
        assert.equal(engine.selection.mask[1 * 40 + 1], 0, 'canvas edge contracts');
        assert.equal(engine.selection.mask[20 * 40 + 5], 255);
        assert.equal(engine.selection.mask[20 * 40 + 9], 0, 'hole grew by two');
    });

    it('Fill respects a feathered mask', () => {
        const engine = CompositorEngine.createHeadless(40, 40);
        const layer = engine.addLayer('Fill');
        engine.setRectSelection(10, 10, 20, 20, false);
        engine.featherSelection(6);
        engine.fillActiveLayer('#ff0000');
        const inside = layer.ctx.getImageData(20, 20, 1, 1).data[3];
        const edge = layer.ctx.getImageData(10, 20, 1, 1).data[3];
        const outside = layer.ctx.getImageData(1, 1, 1, 1).data[3];
        assert.equal(inside, 255);
        assert.ok(edge > 0 && edge < 255, `edge alpha ${edge}`);
        assert.equal(outside, 0);
    });

    it('featherMask and growMask keep the mask size', () => {
        const m = new Uint8Array(25).fill(0); m[12] = 255;
        assert.equal(featherMask(m, 5, 5, 3).length, 25);
        assert.equal(growMask(m, 5, 5, 1).filter(v => v === 255).length, 9);
    });
});
