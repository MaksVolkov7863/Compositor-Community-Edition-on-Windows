const { describe, it } = require('node:test');
const assert = require('node:assert');
const CompositorEngine = require('../src/engine');

describe('Blur Brush Tool Pipeline (Mac BlurBrushTests Parity)', () => {
    it('Blur brush softens hard edge along vertical boundary proportional to radius', () => {
        const engine = CompositorEngine.createHeadless(200, 100);
        const layer = engine.addLayer('Edge', 200, 100);
        const ctx = layer.ctx;

        // Draw hard vertical split: black on left (0..99), white on right (100..199)
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 100, 100);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(100, 0, 100, 100);

        // Apply blur brush at (100, 50) with radius 12
        const res = engine.applyBlurBrush(100, 50, 12, 1.0, false);
        assert.ok(res);

        // Sample pixels across row 50 near the boundary
        const imgData = ctx.getImageData(0, 0, 200, 100);
        const data = imgData.data;

        // Pixel far left (x=20) should still be black
        const leftIdx = (50 * 200 + 20) * 4;
        assert.equal(data[leftIdx], 0);

        // Pixel far right (x=180) should still be white
        const rightIdx = (50 * 200 + 180) * 4;
        assert.equal(data[rightIdx], 255);

        // Near edge (x=98..102), intermediate values should exist
        const midIdx = (50 * 200 + 100) * 4;
        const midVal = data[midIdx];
        assert.ok(midVal > 10 && midVal < 245, `Expected softened edge at x=100, got ${midVal}`);
    });

    it('Radius sets how far blur spreads without altering unaffected areas', () => {
        const engine = CompositorEngine.createHeadless(100, 100);
        const layer = engine.addLayer('Dot', 100, 100);
        const ctx = layer.ctx;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(48, 48, 4, 4);

        // Blur with narrow radius
        engine.applyBlurBrush(50, 50, 6, 0.8, false);
        const data = ctx.getImageData(0, 0, 100, 100).data;

        // Far pixel (10, 10) untouched
        assert.equal(data[(10 * 100 + 10) * 4 + 3], 0);
    });

    it('Blur brush operates on layer raster mask when isMask is true', () => {
        const engine = CompositorEngine.createHeadless(100, 100);
        const layer = engine.addLayer('MaskLayer', 100, 100);
        engine.addLayerMask(layer.id);
        assert.ok(layer.hasMask);

        // Fill mask with white left, black right
        const mCtx = layer.maskCanvas.getContext('2d');
        mCtx.fillStyle = '#ffffff';
        mCtx.fillRect(0, 0, 50, 100);
        mCtx.fillStyle = '#000000';
        mCtx.fillRect(50, 0, 50, 100);

        const ok = engine.applyBlurBrush(50, 50, 10, 0.9, true);
        assert.ok(ok);

        const mData = mCtx.getImageData(0, 0, 100, 100).data;
        const midVal = mData[(50 * 100 + 50) * 4];
        assert.ok(midVal > 0 && midVal < 255, `Mask softened at boundary: ${midVal}`);
    });
});
