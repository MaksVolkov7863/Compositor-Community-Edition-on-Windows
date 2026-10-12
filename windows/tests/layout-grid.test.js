const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { LayoutGrid, GridAppearance, drawLayoutGrid } = require('../src/layout-grid');
const CompositorEngine = require('../src/engine.js');

function recorder() {
    const calls = { moveTo: [], strokes: 0, dashes: [] };
    return {
        calls,
        save() {}, restore() {}, beginPath() {}, lineTo() {},
        moveTo(x, y) { calls.moveTo.push([x, y]); },
        stroke() { calls.strokes++; },
        setLineDash(d) { calls.dashes.push(d); },
        set strokeStyle(v) {}, set lineWidth(v) {}
    };
}

describe('Layout Grid (Mac LayoutGrid / GridAppearance parity)', () => {
    it('defaults to 64 px majors split in eight, clamped to the Mac ranges', () => {
        const g = new LayoutGrid();
        assert.equal(g.spacing, 64);
        assert.equal(g.subdivisions, 8);
        assert.equal(g.step, 8);
        assert.equal(new LayoutGrid(1, 1).spacing, 2);
        assert.equal(new LayoutGrid(4, 64).subdivisions, 4, 'never finer than a pixel');
    });

    it('lists every line from the origin and tells majors from subdivisions', () => {
        const g = new LayoutGrid(10, 3);
        const lines = g.lines(20);
        assert.deepEqual(lines, [0, 3, 7, 10, 13, 17, 20]);
        assert.deepEqual(lines.filter(v => g.isMajor(v)), [0, 10, 20]);
    });

    it('draws in screen space and hides subdivisions closer than 4 screen pixels', () => {
        const g = new LayoutGrid(64, 8);
        const a = new GridAppearance();
        const near = recorder();
        drawLayoutGrid(near, 128, 128, g, a, { originX: 10, originY: 20, scale: 1 });
        assert.equal(near.calls.strokes, 2, 'subdivisions and majors at 100%');
        assert.ok(near.calls.moveTo.some(([x]) => x === 10 + 64 + 0.5), 'a major line lands on a device pixel');
        const far = recorder();
        drawLayoutGrid(far, 128, 128, g, a, { originX: 0, originY: 0, scale: 0.25 });
        assert.equal(far.calls.strokes, 1, 'only majors when zoomed out');
    });

    it('only draws lines on screen', () => {
        const g = new LayoutGrid(8, 1);
        const ctx = recorder();
        const drawn = drawLayoutGrid(ctx, 10000, 10000, g, new GridAppearance(), { originX: -40000, originY: -40000, scale: 8 }, { width: 800, height: 600 });
        assert.ok(drawn > 0 && drawn < 40, `drew ${drawn}`);
    });

    it('snaps to the grid lines when Snap To Grid and Show Grid are on', () => {
        const engine = CompositorEngine.createHeadless(100, 100);
        engine.layoutGrid = new LayoutGrid(50, 2);
        engine.showGrid = true;
        engine.snapToGrid = true;
        engine.snapToLayers = false;
        engine.snapToDocumentBounds = false;
        assert.deepEqual(engine.cropSnapTargets().xs, [0, 25, 50, 75, 100]);
        engine.snapToGrid = false;
        assert.deepEqual(engine.cropSnapTargets().xs, []);
    });
});
