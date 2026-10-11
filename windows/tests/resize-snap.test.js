const { describe, it } = require('node:test');
const assert = require('node:assert');
const CompositorEngine = require('../src/engine');

describe('Resize Handles Snapping Pipeline (Mac ResizeSnapTests Parity)', () => {
    it('Side handle drags snap to adjacent layer boundaries within snap tolerance', () => {
        const engine = CompositorEngine.createHeadless(300, 200);

        // Target layer at x=150
        const other = engine.addLayer('Other', 40, 40);
        other.x = 150;
        other.y = 150;

        // Resizing layer from x=10, width=100
        const resizing = engine.addLayer('Resizing', 100, 100);
        resizing.x = 10;
        resizing.y = 10;

        // Drag right edge to 148 (2px short of 150)
        const snapped = engine.snappedResize(resizing.id, 3, { x: 148, y: 60 }, { tolerance: 5, lockRatio: false });
        assert.equal(snapped.x, 150, 'Right edge snapped cleanly to other layer boundary at 150');
        assert.equal(snapped.y, 60);

        // Drag out of reach (to 130) does not snap
        const free = engine.snappedResize(resizing.id, 3, { x: 130, y: 60 }, { tolerance: 5, lockRatio: false });
        assert.equal(free.x, 130, 'Out of reach remains unsnapped');
    });

    it('Proportional corner dragging locks aspect ratio when Shift is engaged', () => {
        const engine = CompositorEngine.createHeadless(300, 200);
        const layer = engine.addLayer('Square', 100, 100);
        layer.x = 10;
        layer.y = 10;

        // Drag bottom right with lockRatio true
        const snapped = engine.snappedResize(layer.id, 4, { x: 160, y: 150 }, { tolerance: 5, lockRatio: true });
        const newW = snapped.x - layer.x;
        const newH = snapped.y - layer.y;
        assert.equal(newW, newH, 'Aspect ratio locked square');
    });
});
