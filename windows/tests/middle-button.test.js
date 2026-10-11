const { describe, it } = require('node:test');
const assert = require('node:assert');
const CompositorEngine = require('../src/engine');

describe('Middle Button Canvas Navigation Pipeline (Mac MiddleButtonTests Parity)', () => {
    it('Middle mouse button drag without modifier pans the canvas viewport', () => {
        const engine = CompositorEngine.createHeadless(800, 600);
        assert.deepEqual(engine.getPan(), { x: 0, y: 0 });

        engine.startMiddlePan(300, 300);
        engine.middlePanDrag(40, -25, false);
        engine.endMiddlePan();

        const pan = engine.getPan();
        assert.equal(pan.x, 40);
        assert.equal(pan.y, -25);
    });

    it('Middle mouse button drag with zoom modifier adjusts canvas magnification', () => {
        const engine = CompositorEngine.createHeadless(800, 600);
        engine.zoom = 1.0;

        engine.startMiddlePan(300, 300);
        // Drag up zooms in (+50 points)
        engine.middlePanDrag(0, 50, true);
        assert.ok(engine.zoom > 1.0, `Zoom increased: got ${engine.zoom}`);

        // Drag down zooms out
        engine.middlePanDrag(0, -60, true);
        engine.endMiddlePan();
        assert.ok(engine.zoom < 1.5);
    });

    it('Middle mouse pan preserves active tool and restores original state upon release', () => {
        const engine = CompositorEngine.createHeadless(800, 600);
        engine.currentTool = 'brush';

        engine.startMiddlePan(100, 100);
        assert.equal(engine.isMiddlePanning, true);

        engine.endMiddlePan();
        assert.equal(engine.isMiddlePanning, false);
        assert.equal(engine.currentTool, 'brush', 'Restored brush tool');
    });
});
