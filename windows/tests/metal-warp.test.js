const { describe, it } = require('node:test');
const assert = require('node:assert');
const DistortWarp = require('../src/distort-warp');

describe('GPU & Distort Warp Mesh Transformation Pipeline (Mac MetalWarpTests Parity)', () => {
    it('Homography perspective mapping transforms quadrilateral corners accurately', () => {
        const shape = [
            { x: 10, y: 10 },
            { x: 90, y: 10 },
            { x: 100, y: 90 },
            { x: 0, y: 90 }
        ];

        const map = DistortWarp.homography(shape);
        assert.equal(typeof map, 'function');

        // Check unit corners
        const tl = map({ x: 0, y: 0 });
        assert.ok(Math.abs(tl.x - 10) < 1e-4);
        assert.ok(Math.abs(tl.y - 10) < 1e-4);

        const tr = map({ x: 1, y: 0 });
        assert.ok(Math.abs(tr.x - 90) < 1e-4);
        assert.ok(Math.abs(tr.y - 10) < 1e-4);

        const br = map({ x: 1, y: 1 });
        assert.ok(Math.abs(br.x - 100) < 1e-4);
        assert.ok(Math.abs(br.y - 90) < 1e-4);

        const bl = map({ x: 0, y: 1 });
        assert.ok(Math.abs(bl.x - 0) < 1e-4);
        assert.ok(Math.abs(bl.y - 90) < 1e-4);
    });

    it('Interpolation maps interior points continuously without collapsing interior volume', () => {
        const shape = [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
            { x: 100, y: 100 },
            { x: 0, y: 100 }
        ];

        const map = DistortWarp.homography(shape);
        const center = map({ x: 0.5, y: 0.5 });
        assert.ok(Math.abs(center.x - 50) < 1e-4);
        assert.ok(Math.abs(center.y - 50) < 1e-4);

        assert.equal(DistortWarp.isUsable(shape), true);
        assert.equal(DistortWarp.isConvex(shape), true);
    });
});
