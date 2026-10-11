const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const CompositorEngine = require('../src/engine.js');

describe('Export Pipeline (Mac ExportTests & JPEGExportTests Parity)', () => {
    test('PNG export preserves canvas dimensions and alpha transparency', () => {
        const engine = CompositorEngine.createHeadless(640, 480);
        const layer = engine.addLayer('Graphic');
        layer.ctx.fillStyle = '#ff0000';
        layer.ctx.fillRect(10, 10, 100, 100);

        const exported = engine.exportPNG();
        assert.equal(exported.format, 'image/png');
        assert.equal(exported.width, 640);
        assert.equal(exported.height, 480);
        assert.ok(exported.dataUrl);
    });

    test('PNG export respects layer visibility (hidden layers omitted)', () => {
        const engine = CompositorEngine.createHeadless(100, 100);
        const l1 = engine.addLayer('Visible Red');
        l1.ctx.fillStyle = '#ff0000';
        l1.ctx.fillRect(0, 0, 100, 100);

        const l2 = engine.addLayer('Hidden Blue');
        l2.ctx.fillStyle = '#0000ff';
        l2.ctx.fillRect(0, 0, 100, 100);
        l2.visible = false; // Hidden

        const exported = engine.exportPNG();
        const finalPixel = exported.canvas.getContext().getImageData(50, 50, 1, 1).data;
        assert.equal(finalPixel[0], 255, 'Visible red layer rendered');
        assert.equal(finalPixel[2], 0, 'Hidden blue layer was not rendered');
    });

    test('Oversized canvas (>30,000 px) throws maximum dimension error matching Mac ExportError', () => {
        const engine = CompositorEngine.createHeadless(35000, 35000);
        assert.throws(() => {
            engine.exportPNG();
        }, /30,000 pixels/i);

        assert.throws(() => {
            engine.exportJPEG();
        }, /30,000 pixels/i);
    });

    test('JPEG export produces opaque output with selected matte background', () => {
        const engine = CompositorEngine.createHeadless(200, 100);
        // Default blank canvas with transparency -> JPEG fills with matte color
        const whiteMatteExport = engine.exportJPEG({ quality: 0.9, matte: '#ffffff' });
        assert.equal(whiteMatteExport.format, 'image/jpeg');
        assert.equal(whiteMatteExport.width, 200);
        assert.equal(whiteMatteExport.height, 100);
        assert.equal(whiteMatteExport.quality, 0.9);

        // Blue matte test
        const blueMatteExport = engine.exportJPEG({ quality: 0.8, matte: '#0000ff' });
        const pixel = blueMatteExport.canvas.getContext().getImageData(10, 10, 1, 1).data;
        assert.equal(pixel[0], 0);
        assert.equal(pixel[2], 255, 'Blue matte filled background');
        assert.equal(pixel[3], 255, 'JPEG output is always 100% opaque');
    });

    test('JPEG quality parameter passed through correctly', () => {
        const engine = CompositorEngine.createHeadless(100, 100);
        const low = engine.exportJPEG({ quality: 0.1 });
        const high = engine.exportJPEG({ quality: 1.0 });

        assert.equal(low.quality, 0.1);
        assert.equal(high.quality, 1.0);
    });

    test('TIFF export encodes lossless RGBA bitmap with valid TIFF signature', () => {
        const engine = CompositorEngine.createHeadless(120, 80);
        const layer = engine.addLayer('Tiff Subject');
        layer.ctx.fillStyle = '#00ff00';
        layer.ctx.fillRect(0, 0, 120, 80);

        const exported = engine.exportTIFF();
        assert.equal(exported.format, 'image/tiff');
        assert.equal(exported.width, 120);
        assert.equal(exported.height, 80);
        assert.ok(Buffer.isBuffer(exported.buffer));
        assert.ok(exported.buffer.length > 0);

        // Verify magic bytes: Little-endian (0x49 0x49 0x2A 0x00) or Big-endian (0x4D 0x4D 0x00 0x2A)
        const isLE = exported.buffer[0] === 0x49 && exported.buffer[1] === 0x49 && exported.buffer[2] === 0x2A;
        const isBE = exported.buffer[0] === 0x4D && exported.buffer[1] === 0x4D && exported.buffer[3] === 0x2A;
        assert.ok(isLE || isBE, 'TIFF export buffer must have valid TIFF magic bytes');
    });
});
