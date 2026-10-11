const { describe, it } = require('node:test');
const assert = require('node:assert');
const { createMockCanvas } = require('../src/engine/mock-canvas');
const {
    normalizeRotation,
    snappedResize,
    cropLayerToCanvas
} = require('../src/engine/transform');

describe('Engine Submodule: Transform & Geometry', () => {
    it('normalizeRotation normalizes and snaps within 5 degrees to right angles', () => {
        assert.equal(normalizeRotation(0), 0);
        assert.equal(normalizeRotation(4), 0, 'Snaps to 0 within 5 deg');
        assert.equal(normalizeRotation(88), 90, 'Snaps to 90 within 5 deg');
        assert.equal(normalizeRotation(-92), -90, 'Snaps to -90 within 5 deg');
        assert.equal(normalizeRotation(45), 45, '45 degrees does not snap');
    });

    it('snappedResize snaps edge handles to document boundary within tolerance', () => {
        const layer = { id: 'l1', x: 20, y: 20, width: 100, height: 100 };
        const pt = { x: 198, y: 50 };
        const snapped = snappedResize(layer, 200, 200, [], 3, pt, { tolerance: 5 });
        assert.equal(snapped.x, 200);
    });

    it('cropLayerToCanvas clamps layer coordinates and dimensions', () => {
        const canvas = createMockCanvas(300, 300);
        const ctx = canvas.getContext('2d');
        const layer = {
            id: 'l1',
            canvas,
            ctx,
            x: -20,
            y: -10,
            width: 300,
            height: 300
        };

        const ok = cropLayerToCanvas(layer, 200, 200, (w, h) => createMockCanvas(w, h));
        assert.ok(ok);
        assert.equal(layer.x, 0);
        assert.equal(layer.y, 0);
        assert.ok(layer.width <= 200);
        assert.ok(layer.height <= 200);
        assert.ok(layer.croppedToCanvas);
    });
});
