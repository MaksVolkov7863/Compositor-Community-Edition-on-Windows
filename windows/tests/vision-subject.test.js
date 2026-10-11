const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const CompositorEngine = require('../src/engine');
const { VisionSegmentation, VisionFailure } = require('../src/vision-segmentation');

describe('Vision AI & Subject Removal Pipeline (Mac SubjectRemoval Parity)', () => {

    test('Select Subject detects central foreground object and creates active selection', async () => {
        const engine = CompositorEngine.createHeadless(100, 100);
        const layer = engine.getActiveLayer();

        // White background
        layer.ctx.fillStyle = '#ffffff';
        layer.ctx.fillRect(0, 0, 100, 100);

        // Distinct blue subject in center [30, 30, 40, 40]
        layer.ctx.fillStyle = '#0000ff';
        layer.ctx.fillRect(30, 30, 40, 40);

        const ok = await engine.selectSubject();
        assert.equal(ok, true);
        assert.ok(engine.selection, 'Active selection should be created');
        assert.equal(engine.selection.type, 'subject');

        // Selection bounds should tightly enclose the subject
        assert.ok(engine.selection.bounds.x >= 28 && engine.selection.bounds.x <= 32);
        assert.ok(engine.selection.bounds.y >= 28 && engine.selection.bounds.y <= 32);
        assert.ok(engine.selection.bounds.width >= 36 && engine.selection.bounds.width <= 44);

        // History entry
        assert.equal(engine.history[engine.historyIndex].name, 'Select Subject');
    });

    test('Remove Background creates non-destructive layer mask isolating subject', async () => {
        const engine = CompositorEngine.createHeadless(80, 80);
        const layer = engine.getActiveLayer();

        // Pale gray background
        layer.ctx.fillStyle = '#f0f0f0';
        layer.ctx.fillRect(0, 0, 80, 80);

        // Vivid red subject in center [20, 20, 40, 40]
        layer.ctx.fillStyle = '#ff0000';
        layer.ctx.fillRect(20, 20, 40, 40);

        const ok = await engine.removeBackground();
        assert.equal(ok, true);
        assert.equal(layer.hasMask, true, 'Layer must now possess a raster mask');
        assert.ok(layer.maskCanvas);

        // Check mask pixels: center should be opaque white (255), corner should be transparent/black (0)
        const maskCtx = layer.maskCanvas.getContext('2d');
        const centerMask = maskCtx.getImageData(40, 40, 1, 1).data;
        const cornerMask = maskCtx.getImageData(5, 5, 1, 1).data;

        assert.equal(centerMask[3], 255, 'Subject center should be revealed by mask');
        assert.equal(cornerMask[3], 0, 'Background corner should be concealed by mask');

        // History step
        assert.equal(engine.history[engine.historyIndex].name, 'Remove Background');

        // Undo restores unmasked layer state
        engine.undo();
        const restored = engine.getActiveLayer();
        assert.equal(restored.hasMask, false, 'Undo should restore previous layer mask state');
    });

    test('Edge refinement handles shiftEdge rim dropping and contrast sharpening', () => {
        const w = 40, h = 40;
        const rawMask = new Uint8Array(w * h);
        // Fill circle in center
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const dist = Math.sqrt((x - 20) ** 2 + (y - 20) ** 2);
                rawMask[y * w + x] = dist <= 12 ? 200 : 0;
            }
        }

        // Shift Edge inwards (erosion, e.g. -2)
        const eroded = VisionSegmentation.refineMatte(rawMask, null, w, h, { shiftEdge: -2 });
        // Point at distance 11 should now be eroded
        assert.ok(eroded[20 * w + 31] < rawMask[20 * w + 31], 'Edge should be shifted inwards');

        // Contrast sharpening
        const contrasted = VisionSegmentation.refineMatte(rawMask, null, w, h, { matteContrast: 50 });
        assert.ok(contrasted[20 * w + 20] >= 200, 'Contrast pushes high grays towards 255');
    });

    test('Throws noSubject failure when image is uniform without distinct foreground', async () => {
        const engine = CompositorEngine.createHeadless(60, 60);
        const layer = engine.getActiveLayer();

        // Uniform solid color across entire layer
        layer.ctx.fillStyle = '#4488cc';
        layer.ctx.fillRect(0, 0, 60, 60);

        await assert.rejects(async () => {
            await engine.selectSubject();
        }, (err) => {
            assert.equal(err.name, 'VisionFailure');
            assert.equal(err.code, 'noSubject');
            assert.match(err.message, /No foreground subject was detected/i);
            return true;
        });
    });
});
