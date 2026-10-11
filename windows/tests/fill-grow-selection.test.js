const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const CompositorEngine = require('../src/engine.js');

describe('Fill, Copy Merged and Expand/Contract Selection', () => {
    it('Fill without a selection paints the whole active layer and records history', () => {
        const engine = CompositorEngine.createHeadless(20, 10);
        const layer = engine.addLayer('Fill');
        const historyBefore = engine.history.length;
        assert.equal(engine.fillActiveLayer('#ff0000'), true);
        const px = layer.ctx.getImageData(5, 5, 1, 1).data;
        assert.deepEqual([px[0], px[1], px[2], px[3]], [255, 0, 0, 255]);
        assert.equal(engine.history.length, historyBefore + 1);
    });

    it('notifyStatus forwards messages to the status bar callback', () => {
        const engine = CompositorEngine.createHeadless(10, 10);
        let message = null;
        engine.onStatusChange = (m) => { message = m; };
        engine.notifyStatus('Hello');
        assert.equal(message, 'Hello');
    });

    it('Expand grows a rectangular selection and Contract shrinks it', () => {
        const engine = CompositorEngine.createHeadless(40, 40);
        engine.setRectSelection(10, 10, 10, 10, false);
        assert.equal(engine.growSelection(2), true);
        assert.deepEqual(engine.selection.bounds, { x: 8, y: 8, width: 14, height: 14 });
        assert.equal(engine.growSelection(-4), true);
        assert.deepEqual(engine.selection.bounds, { x: 12, y: 12, width: 6, height: 6 });
    });

    it('Contracting a selection away deselects', () => {
        const engine = CompositorEngine.createHeadless(20, 20);
        engine.setRectSelection(5, 5, 2, 2, false);
        engine.growSelection(-3);
        assert.equal(engine.selection, null);
    });

    it('Copy Merged puts the selected area on the clipboard', () => {
        const engine = CompositorEngine.createHeadless(30, 20);
        engine.setRectSelection(2, 3, 8, 5, false);
        const clip = engine.copyMergedSelection();
        assert.equal(clip.width, 8);
        assert.equal(clip.height, 5);
        assert.equal(clip.x, 2);
        assert.equal(clip.y, 3);
    });
});
