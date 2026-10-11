const { describe, it } = require('node:test');
const assert = require('node:assert');
const CompositorEngine = require('../src/engine');

describe('Finishing Filters: Vignette, Sharpen & Bloom Pipeline (Mac FinishingFilterTests Parity)', () => {
    it('Vignette darkens edges and outer corners while keeping center bright', () => {
        const engine = CompositorEngine.createHeadless(100, 100);
        const layer = engine.addLayer('Base', 100, 100);
        const ctx = layer.ctx;

        // Fill with solid white
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 100, 100);

        engine.applyVignette(layer.id, { amount: 0.8, radius: 0.7, roundness: 1.0 });

        const data = ctx.getImageData(0, 0, 100, 100).data;

        // Center pixel (50, 50) remains white
        const centerIdx = (50 * 100 + 50) * 4;
        assert.equal(data[centerIdx], 255);
        assert.equal(data[centerIdx + 1], 255);

        // Corner pixel (2, 2) is significantly darkened
        const cornerIdx = (2 * 100 + 2) * 4;
        assert.ok(data[cornerIdx] < 150, `Corner darkened by vignette: got ${data[cornerIdx]}`);
    });

    it('Sharpen filter enhances high-frequency contrast across edges', () => {
        const engine = CompositorEngine.createHeadless(50, 50);
        const layer = engine.addLayer('Edge', 50, 50);
        const ctx = layer.ctx;

        // Stepped gradient
        ctx.fillStyle = '#404040';
        ctx.fillRect(0, 0, 25, 50);
        ctx.fillStyle = '#c0c0c0';
        ctx.fillRect(25, 0, 25, 50);

        engine.applySharpen(layer.id, 0.6);

        const data = ctx.getImageData(0, 0, 50, 50).data;
        // Edge contrast is boosted
        const darkSide = data[(25 * 50 + 24) * 4];
        const lightSide = data[(25 * 50 + 26) * 4];
        assert.ok(lightSide >= 192, `High side boosted: ${lightSide}`);
        assert.ok(darkSide <= 64, `Dark side boosted: ${darkSide}`);
    });

    it('Bloom / Glow filter brightens luminous highlights without washing out shadows', () => {
        const engine = CompositorEngine.createHeadless(60, 60);
        const layer = engine.addLayer('Highlight', 60, 60);
        const ctx = layer.ctx;

        // Shadow at (10, 10), bright star at (40, 40)
        ctx.fillStyle = '#202020';
        ctx.fillRect(0, 0, 60, 60);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(38, 38, 5, 5);

        engine.applyBloomGlow(layer.id, { threshold: 200, intensity: 0.5 });

        const data = ctx.getImageData(0, 0, 60, 60).data;
        // Shadow unchanged
        const shadowVal = data[(10 * 60 + 10) * 4];
        assert.equal(shadowVal, 32);

        // Highlight at peak
        const starVal = data[(40 * 60 + 40) * 4];
        assert.equal(starVal, 255);
    });
});
