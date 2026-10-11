const { describe, it } = require('node:test');
const assert = require('node:assert');
const CompositorEngine = require('../src/engine');

describe('Scanlines CRT Retro Filter Pipeline (Mac ScanlinesTests Parity)', () => {
    it('Scanlines renders periodic dark bands across canvas spacing', () => {
        const engine = CompositorEngine.createHeadless(16, 32);
        const layer = engine.addLayer('ScanTarget', 16, 32);
        const ctx = layer.ctx;

        // Solid white canvas
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 16, 32);

        // Apply scanlines with spacing=8, lineWidth=2, intensity=0.8
        engine.applyScanlines(layer.id, { lineSpacing: 8, lineWidth: 2, intensity: 0.8 });

        const data = ctx.getImageData(0, 0, 16, 32).data;

        // Rows in line band (y=0, 1) should remain bright
        const lineVal = data[(0 * 16 + 5) * 4];
        assert.equal(lineVal, 255);

        // Rows in dark gap (y=4, 5) should be dimmed
        const gapVal = data[(4 * 16 + 5) * 4];
        assert.ok(gapVal < 100, `Expected dark gap in scanline, got ${gapVal}`);
    });

    it('Black level illuminates gaps on dark screen background', () => {
        const engine = CompositorEngine.createHeadless(16, 32);
        const layer = engine.addLayer('BlackTarget', 16, 32);
        const ctx = layer.ctx;

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 16, 32);

        engine.applyScanlines(layer.id, { lineSpacing: 8, blackLevel: 40 });

        const data = ctx.getImageData(0, 0, 16, 32).data;
        assert.equal(data[0], 40, 'Black level illuminated pixels');
    });
});
