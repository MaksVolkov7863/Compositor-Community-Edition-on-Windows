const { describe, it } = require('node:test');
const assert = require('node:assert');
const { createMockCanvas } = require('../src/engine/mock-canvas');
const {
    applyVignette,
    applySharpen,
    applyBloomGlow,
    applyScanlines,
    applyDither
} = require('../src/engine/filters');

describe('Engine Submodule: Filters', () => {
    it('applyVignette darkens canvas outer edges while preserving center', () => {
        const canvas = createMockCanvas(100, 100);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 100, 100);

        const layer = { canvas, ctx, width: 100, height: 100 };
        const ok = applyVignette(layer, { amount: 0.8, radius: 0.7, roundness: 1.0 });
        assert.ok(ok);

        const data = ctx.getImageData(0, 0, 100, 100).data;
        const centerIdx = (50 * 100 + 50) * 4;
        const cornerIdx = (2 * 100 + 2) * 4;

        assert.equal(data[centerIdx], 255);
        assert.ok(data[cornerIdx] < 150);
    });

    it('applySharpen boosts high frequency edge contrast', () => {
        const canvas = createMockCanvas(40, 40);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#404040';
        ctx.fillRect(0, 0, 20, 40);
        ctx.fillStyle = '#c0c0c0';
        ctx.fillRect(20, 0, 20, 40);

        const layer = { canvas, ctx, width: 40, height: 40 };
        const ok = applySharpen(layer, 0.8);
        assert.ok(ok);
    });

    it('applyBloomGlow boosts highlights above threshold', () => {
        const canvas = createMockCanvas(40, 40);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#202020';
        ctx.fillRect(0, 0, 40, 40);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(20, 20, 2, 2);

        const layer = { canvas, ctx, width: 40, height: 40 };
        const ok = applyBloomGlow(layer, { threshold: 200, intensity: 0.5 });
        assert.ok(ok);

        const data = ctx.getImageData(0, 0, 40, 40).data;
        const darkIdx = (5 * 40 + 5) * 4;
        const starIdx = (20 * 40 + 20) * 4;
        assert.equal(data[darkIdx], 32);
        assert.equal(data[starIdx], 255);
    });

    it('applyScanlines renders horizontal scan lines', () => {
        const canvas = createMockCanvas(16, 16);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 16, 16);

        const layer = { canvas, ctx, width: 16, height: 16 };
        const ok = applyScanlines(layer, { lineSpacing: 4, lineWidth: 1, intensity: 0.8 });
        assert.ok(ok);

        const data = ctx.getImageData(0, 0, 16, 16).data;
        const lineVal = data[(0 * 16 + 5) * 4];
        const gapVal = data[(2 * 16 + 5) * 4];
        assert.equal(lineVal, 255);
        assert.ok(gapVal < 100);
    });

    it('applyDither quantizes image with Bayer ordered matrix', () => {
        const canvas = createMockCanvas(8, 8);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#808080';
        ctx.fillRect(0, 0, 8, 8);

        const layer = { canvas, ctx, width: 8, height: 8 };
        const ok = applyDither(layer, 'bayer4', { palette: 'mono' });
        assert.ok(ok);

        const data = ctx.getImageData(0, 0, 8, 8).data;
        const val = data[0];
        assert.ok(val === 0 || val === 255);
    });
});
