const { describe, it } = require('node:test');
const assert = require('node:assert');
const CompositorEngine = require('../src/engine');

describe('Dither Filter & Gradient De-banding Pipeline (Mac RawDitherTests Parity)', () => {
    it('Dithered gradient disperses tone steps across rows smoothly', () => {
        const engine = CompositorEngine.createHeadless(60, 40);
        const layer = engine.createLayer('Grad', 60, 40);
        const ctx = layer.ctx;

        // Draw linear gradient
        for (let y = 0; y < 40; y++) {
            const val = Math.round(70 + (y / 40) * 30);
            ctx.fillStyle = `rgb(${val}, ${val}, ${val})`;
            ctx.fillRect(0, y, 60, 1);
        }

        // Apply Bayer 4x4 dither
        engine.applyDither(layer.id, { method: 'bayer4', spread: 32 });

        const data = ctx.getImageData(0, 0, 60, 40).data;
        const topRow = (0 * 60 + 30) * 4;
        const bottomRow = (39 * 60 + 30) * 4;

        // Top is darker than bottom
        assert.ok(data[topRow] < data[bottomRow], 'Top row darker than bottom row');
    });

    it('Dither is fine, bounded, and preserves opaque alpha channel', () => {
        const engine = CompositorEngine.createHeadless(32, 32);
        const layer = engine.createLayer('Flat', 32, 32);
        const ctx = layer.ctx;

        ctx.fillStyle = '#808080'; // 128 mid-gray
        ctx.fillRect(0, 0, 32, 32);

        engine.applyDither(layer.id, { method: 'bayer2', spread: 16 });

        const data = ctx.getImageData(0, 0, 32, 32).data;
        for (let i = 0; i < data.length; i += 4) {
            assert.equal(data[i + 3], 255, 'Alpha remains 255');
            assert.ok(data[i] >= 110 && data[i] <= 146, `Pixel value ${data[i]} bounded near mid-gray`);
        }
    });

    it('Chunky pixel option downsamples into chunky blocks before dithering', () => {
        const engine = CompositorEngine.createHeadless(20, 20);
        const layer = engine.createLayer('Chunky', 20, 20);
        const ctx = layer.ctx;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 20, 20);

        engine.applyDither(layer.id, { method: 'bayer4', chunky: 4 });

        const data = ctx.getImageData(0, 0, 20, 20).data;
        // Block (0..3, 0..3) has uniform chunky structure
        assert.equal(data[0], data[1 * 4]);
    });
});
