const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {
    ImageImporter,
    ImageFolder,
    ImageImportError,
    DocumentLimits,
    applyOrientation,
    createThumbnail,
    identifyFormat,
    isTIFF,
    decodeTIFF,
    encodeTIFF,
    isHEIC,
    decodeHEIC
} = require('../src/image-importer');
const CompositorEngine = require('../src/engine');

describe('Image Import & Multi-Format Pipeline (Mac ImageImportTests Parity)', () => {

    test('TIFF import and export round-trip preserves dimensions and RGBA pixels', () => {
        // Create 64x32 test raster: red left half, transparent right half (matching Swift test fixture)
        const w = 64, h = 32;
        const rgba = new Uint8Array(w * h * 4);
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const idx = (y * w + x) * 4;
                if (x < 32) {
                    rgba[idx] = 255;   // Red
                    rgba[idx + 1] = 0;
                    rgba[idx + 2] = 0;
                    rgba[idx + 3] = 255;
                } else {
                    rgba[idx + 3] = 0; // Transparent
                }
            }
        }

        // Encode to TIFF
        const tiffBuffer = encodeTIFF(rgba, w, h);
        assert.ok(isTIFF(tiffBuffer), 'Generated buffer must be recognized as TIFF');

        // Decode from TIFF
        const decoded = decodeTIFF(tiffBuffer);
        assert.equal(decoded.width, 64);
        assert.equal(decoded.height, 32);
        assert.equal(decoded.format, 'image/tiff');
        assert.equal(decoded.data[0], 255, 'Red channel on left half must be 255');
        assert.equal(decoded.data[3], 255, 'Alpha channel on left half must be 255');
        assert.equal(decoded.data[(63) * 4 + 3], 0, 'Right half must remain transparent');
    });

    test('HEIC container format detection identifies ISOBMFF ftyp boxes with HEIF brands', () => {
        // Construct minimal ISOBMFF ftyp header for HEIC
        const ftyp = Buffer.alloc(32);
        ftyp.writeUInt32BE(32, 0);                 // box size
        ftyp.write('ftyp', 4, 4, 'ascii');        // box type
        ftyp.write('heic', 8, 4, 'ascii');        // major brand
        ftyp.writeUInt32BE(0, 12);                // minor version
        ftyp.write('mif1', 16, 4, 'ascii');       // compatible brand 1
        ftyp.write('heic', 20, 4, 'ascii');       // compatible brand 2

        assert.ok(isHEIC(ftyp), 'HEIC ftyp buffer must be detected as HEIC');
        assert.equal(identifyFormat(ftyp), 'heic');

        // Non-HEIC container
        const dummy = Buffer.from('RIFF1234WEBPVP8 ');
        assert.equal(isHEIC(dummy), false);
    });

    test('Supported formats list includes PNG, JPEG, TIFF, and HEIC', () => {
        assert.ok(ImageImporter.importableExtensions.includes('.png'));
        assert.ok(ImageImporter.importableExtensions.includes('.jpg'));
        assert.ok(ImageImporter.importableExtensions.includes('.jpeg'));
        assert.ok(ImageImporter.importableExtensions.includes('.tiff'));
        assert.ok(ImageImporter.importableExtensions.includes('.tif'));
        assert.ok(ImageImporter.importableExtensions.includes('.heic'));
        assert.ok(ImageImporter.importableExtensions.includes('.heif'));
        assert.ok(ImageImporter.importableExtensions.includes('.webp'));
    });

    test('WebP import preserves transparency (Mac webPImportPreservesTransparency parity)', async () => {
        // 64x32 Lossless WebP fixture matching ImageImportTests.swift line 41
        const encoded = "UklGRiYAAABXRUJQVlA4TBkAAAAvP8AHEA8Q8x/zHwyxYDJ/6RB6I/ofVfANAA==";
        const buffer = Buffer.from(encoded, 'base64');

        const importer = ImageImporter.shared;
        const result = await importer.decode(buffer, { filename: 'test.webp' });

        assert.equal(result.width, 64);
        assert.equal(result.height, 32);
        assert.equal(result.format, 'webp');
        assert.ok(result.data[0] >= 250, 'Left half red channel');
        assert.equal(result.data[3], 255, 'Left half opaque alpha');
        assert.equal(result.data[63 * 4 + 3], 0, 'Right half transparent alpha');
        assert.ok(result.thumbnail.width <= 96);
        assert.ok(result.thumbnail.height <= 96);
    });

    test('EXIF orientation normalization transposes dimensions for orientation 6 (Mac orientation parity)', () => {
        const w = 64, h = 32;
        const data = new Uint8ClampedArray(w * h * 4);
        // Put a marker pixel at (0, 0)
        data[0] = 123; data[1] = 45; data[2] = 67; data[3] = 255;

        // Orientation 6: Rotate 90 CW (transposes dimensions to 32x64)
        const oriented = applyOrientation(data, w, h, 6);
        assert.equal(oriented.width, 32);
        assert.equal(oriented.height, 64);

        // Pixel at (0, 0) in 64x32 moves to (h - 1 - y, x) = (31, 0) in 32x64
        const targetIdx = (0 * 32 + 31) * 4;
        assert.equal(oriented.data[targetIdx], 123);
        assert.equal(oriented.data[targetIdx + 1], 45);
        assert.equal(oriented.data[targetIdx + 2], 67);
        assert.equal(oriented.data[targetIdx + 3], 255);
    });

    test('Thumbnail generator bounds thumbnails within max 96x96 pixels', () => {
        const fullData = new Uint8ClampedArray(1920 * 1080 * 4);
        const thumb = createThumbnail(fullData, 1920, 1080, 96);
        assert.ok(thumb.width <= 96);
        assert.ok(thumb.height <= 96);
        assert.equal(thumb.width, 96);
        assert.equal(thumb.height, 54);
    });

    test('Document limits and error handling match Mac ImageImportError specifications', async () => {
        const importer = ImageImporter.shared;

        // 1. Over budget remainingPixels throws tooLarge
        const tiffBuf = encodeTIFF(new Uint8Array(64 * 32 * 4), 64, 32);
        await assert.rejects(async () => {
            await importer.decode(tiffBuf, { remainingPixels: 10 });
        }, (err) => {
            assert.equal(err.name, 'ImageImportError');
            assert.equal(err.type, 'tooLarge');
            return true;
        });

        // 2. Corrupt / invalid data throws unreadable
        const invalidBuf = Buffer.from('Not an image content payload');
        await assert.rejects(async () => {
            await importer.decode(invalidBuf, { filename: 'corrupt.png' });
        }, (err) => {
            assert.equal(err.name, 'ImageImportError');
            return true;
        });

        // 3. Unsupported format (e.g. GIF) throws unsupported
        const gifHeader = Buffer.from('GIF89a\x01\x00\x01\x00');
        await assert.rejects(async () => {
            await importer.decode(gifHeader, { filename: 'animation.gif' });
        }, (err) => {
            assert.equal(err.name, 'ImageImportError');
            assert.equal(err.type, 'unsupported');
            return true;
        });
    });

    test('ImageFolder finds images and sorts them in natural order ("2" before "10")', () => {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'comp-folder-test-'));
        try {
            // Create dummy files
            fs.writeFileSync(path.join(tmpDir, '10 Ten.png'), 'dummy');
            fs.writeFileSync(path.join(tmpDir, '2 Two.jpg'), 'dummy');
            fs.writeFileSync(path.join(tmpDir, '.Hidden.png'), 'dummy');
            fs.writeFileSync(path.join(tmpDir, 'Notes.txt'), 'notes');

            assert.ok(ImageFolder.matches(tmpDir));

            const images = ImageFolder.images(tmpDir);
            assert.equal(images.length, 2);
            assert.equal(path.basename(images[0]), '2 Two.jpg');
            assert.equal(path.basename(images[1]), '10 Ten.png');
        } finally {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }
    });

    test('CompositorEngine integrates with importImage and exportTIFF', async () => {
        const engine = CompositorEngine.createHeadless(100, 100);

        // Create TIFF image buffer to import
        const rgba = new Uint8Array(40 * 30 * 4);
        for (let i = 0; i < rgba.length; i += 4) {
            rgba[i] = 0; rgba[i + 1] = 0; rgba[i + 2] = 255; rgba[i + 3] = 255; // Blue
        }
        const tiffBuffer = encodeTIFF(rgba, 40, 30);

        // Import into engine
        const layer = await engine.importImage(tiffBuffer, { filename: 'ImportedTest.tiff', x: 10, y: 15 });
        assert.ok(layer);
        assert.equal(layer.name, 'ImportedTest');
        assert.equal(layer.width, 40);
        assert.equal(layer.height, 30);
        assert.equal(layer.x, 10);
        assert.equal(layer.y, 15);
        assert.equal(engine.layers.length, 2); // default layer + imported layer

        // Export engine composite to TIFF
        const exportedTiff = engine.exportTIFF();
        assert.equal(exportedTiff.format, 'image/tiff');
        assert.equal(exportedTiff.width, 100);
        assert.equal(exportedTiff.height, 100);
        assert.ok(isTIFF(exportedTiff.buffer));
    });
});
