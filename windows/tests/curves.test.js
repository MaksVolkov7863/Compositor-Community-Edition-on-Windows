const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { CurvesSettings } = require('../src/curves');
const CompositorEngine = require('../src/engine.js');

describe('Curves (Mac CurvesSettings parity)', () => {
    it('starts as the identity on every channel', () => {
        const c = new CurvesSettings();
        assert.equal(c.isValid, true);
        assert.equal(c.isIdentity, true);
        const [r, g, b] = c.tables();
        for (const i of [0, 64, 128, 255]) assert.deepEqual([r[i], g[i], b[i]], [i, i, i]);
    });

    it('passes exactly through its points and never overshoots between them', () => {
        const c = new CurvesSettings();
        c.addPoint(64, 128);
        c.addPoint(192, 160);
        assert.equal(Math.round(c.value(64)), 128);
        assert.equal(Math.round(c.value(192)), 160);
        for (let x = 64; x <= 192; x++) {
            const y = c.value(x);
            assert.ok(y >= 128 - 1e-9 && y <= 160 + 1e-9, `monotone between handles at ${x}: ${y}`);
        }
    });

    it('runs each channel through its own curve, then the RGB curve', () => {
        const c = new CurvesSettings();
        c.channels[1] = [{ x: 0, y: 255 }, { x: 255, y: 0 }]; // Red inverted
        const [r, g] = c.tables();
        assert.equal(r[0], 255);
        assert.equal(g[0], 0);
        c.channels[0] = [{ x: 0, y: 0 }, { x: 255, y: 128 }]; // RGB halves the output
        assert.equal(c.tables()[0][0], 128);
    });

    it('limits points: no duplicates within a pixel, ends fixed, at most 32', () => {
        const c = new CurvesSettings();
        assert.equal(c.addPoint(100, 100), 1);
        assert.equal(c.addPoint(101, 50), -1);
        assert.equal(c.addPoint(0.5, 10), -1);
        assert.equal(c.removePoint(0), false);
        c.movePoint(1, 300, 300);
        assert.ok(c.channels[0][1].x < 255 && c.channels[0][1].y === 255);
        for (let x = 3; x < 250; x += 7) c.addPoint(x, x);
        assert.ok(c.channels[0].length <= 32);
        assert.equal(c.isValid, true);
    });

    it('engine.applyCurvesSettings changes the active layer and records one history step', () => {
        const engine = CompositorEngine.createHeadless(8, 8);
        const layer = engine.addLayer('Gray');
        layer.ctx.fillStyle = '#404040';
        layer.ctx.fillRect(0, 0, 8, 8);
        const before = engine.history.length;
        const c = new CurvesSettings();
        c.addPoint(64, 192);
        assert.equal(engine.applyCurvesSettings(c), true);
        const px = layer.ctx.getImageData(2, 2, 1, 1).data;
        assert.equal(px[0], 192);
        assert.equal(engine.history.length, before + 1);
        assert.equal(engine.history[engine.history.length - 1].name, 'Curves');
    });
});
