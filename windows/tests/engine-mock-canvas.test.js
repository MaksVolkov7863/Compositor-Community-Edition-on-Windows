const { describe, it } = require('node:test');
const assert = require('node:assert');
const { createMockCanvas } = require('../src/engine/mock-canvas');

describe('Engine Submodule: Mock Canvas', () => {
    it('creates mock canvas with 2D context and default dimensions', () => {
        const canvas = createMockCanvas(400, 300);
        assert.equal(canvas.width, 400);
        assert.equal(canvas.height, 300);

        const ctx = canvas.getContext('2d');
        assert.ok(ctx);
        assert.equal(typeof ctx.fillRect, 'function');
        assert.equal(typeof ctx.getImageData, 'function');
        assert.equal(typeof ctx.createImageData, 'function');
    });

    it('handles fillRect and getImageData color buffer retrieval', () => {
        const canvas = createMockCanvas(50, 50);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(10, 10, 20, 20);

        const imgData = ctx.getImageData(0, 0, 50, 50);
        assert.equal(imgData.width, 50);
        assert.equal(imgData.height, 50);

        // Outside rectangle is transparent
        const outIdx = (5 * 50 + 5) * 4;
        assert.equal(imgData.data[outIdx + 3], 0);

        // Inside rectangle is opaque red
        const inIdx = (15 * 50 + 15) * 4;
        assert.equal(imgData.data[inIdx], 255);
        assert.equal(imgData.data[inIdx + 1], 0);
        assert.equal(imgData.data[inIdx + 2], 0);
        assert.equal(imgData.data[inIdx + 3], 255);
    });

    it('createImageData allocates properly dimensioned Uint8ClampedArray', () => {
        const canvas = createMockCanvas(10, 10);
        const ctx = canvas.getContext('2d');
        const imgData = ctx.createImageData(32, 16);
        assert.equal(imgData.width, 32);
        assert.equal(imgData.height, 16);
        assert.equal(imgData.data.length, 32 * 16 * 4);
    });
});
