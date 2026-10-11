const { describe, it } = require('node:test');
const assert = require('node:assert');
const CompositorEngine = require('../src/engine');

describe('New Canvas Units, DPI & Presets Pipeline (Mac NewCanvasUnitTests Parity)', () => {
    it('Print sizes calculate correct pixel dimensions at specified DPI resolution', () => {
        // US Letter 8.5 x 11 at 300 DPI
        assert.equal(CompositorEngine.unitToPixels('8.5', 'inches', 300), 2550);
        assert.equal(CompositorEngine.unitToPixels('11', 'inches', 300), 3300);

        // A4 width: 210 mm at 300 DPI = 2480 px
        assert.equal(CompositorEngine.unitToPixels('210', 'millimeters', 300), 2480);

        // Centimeters: 2.54 cm = 1 inch = 72 px at 72 DPI
        assert.equal(CompositorEngine.unitToPixels('2,54', 'centimeters', 72), 72);

        // Whole pixels ignore DPI
        assert.equal(CompositorEngine.unitToPixels('1920', 'pixels', 300), 1920);

        // Fractional pixels rejected
        assert.equal(CompositorEngine.unitToPixels('19.5', 'pixels', 72), null);

        // Excess size over 30,000 px rejected
        assert.equal(CompositorEngine.unitToPixels('200', 'inches', 300), null);
    });

    it('Units conversion roundtrips between pixels and text representation', () => {
        assert.equal(CompositorEngine.pixelsToUnitText(1920, 'inches', 72), '26.67');
        assert.equal(CompositorEngine.pixelsToUnitText(2550, 'inches', 300), '8.5');
        assert.equal(CompositorEngine.pixelsToUnitText(2480, 'millimeters', 300), '209.97');

        const roundtrip = CompositorEngine.unitToPixels(
            CompositorEngine.pixelsToUnitText(2550, 'inches', 300),
            'inches',
            300
        );
        assert.equal(roundtrip, 2550);
    });

    it('New project initializes with specified resolution and fills initial background', () => {
        const engine = CompositorEngine.createHeadless(40, 30);
        engine.resolution = 300;
        assert.equal(engine.resolution, 300);

        const bgLayer = engine.createLayer('Background', 40, 30);
        bgLayer.ctx.fillStyle = '#ffffff';
        bgLayer.ctx.fillRect(0, 0, 40, 30);

        const data = bgLayer.ctx.getImageData(0, 0, 40, 30).data;
        assert.equal(data[0], 255);
        assert.equal(data[3], 255);
    });
});
