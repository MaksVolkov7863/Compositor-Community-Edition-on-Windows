const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { PSDReader } = require('../src/psd-reader');
const { ImageImporter } = require('../src/image-importer');

// A minimal 8-bit PSD: header, empty sections, then the composite image data.
function psd(width, height, channels, planes, rle = false) {
    const header = Buffer.alloc(26);
    header.write('8BPS', 0);
    header.writeUInt16BE(1, 4);
    header.writeUInt16BE(channels, 12);
    header.writeUInt32BE(height, 14);
    header.writeUInt32BE(width, 18);
    header.writeUInt16BE(8, 22);
    header.writeUInt16BE(3, 24);
    const empty = Buffer.alloc(12); // color mode, resources, layers: all zero length
    const parts = [header, empty, Buffer.from([0, rle ? 1 : 0])];
    if (!rle) {
        for (const p of planes) parts.push(Buffer.from(p));
    } else {
        const rows = [];
        for (const p of planes) {
            for (let y = 0; y < height; y++) {
                const row = p.slice(y * width, (y + 1) * width);
                // one literal run per row
                rows.push(Buffer.from([row.length - 1, ...row]));
            }
        }
        const counts = Buffer.alloc(rows.length * 2);
        rows.forEach((r, i) => counts.writeUInt16BE(r.length, i * 2));
        parts.push(counts, ...rows);
    }
    return Buffer.concat(parts);
}

describe('PSD composite import', () => {
    const w = 3, h = 2;
    const red = [10, 20, 30, 40, 50, 60], green = [1, 2, 3, 4, 5, 6], blue = [100, 100, 100, 100, 100, 100], alpha = [255, 128, 0, 255, 255, 255];

    it('decodes a raw RGB composite', () => {
        const out = PSDReader.composite(psd(w, h, 3, [red, green, blue]));
        assert.equal(out.width, 3);
        assert.deepEqual([...out.data.slice(4, 8)], [20, 2, 100, 255]);
    });

    it('decodes a PackBits RGBA composite', () => {
        const out = PSDReader.composite(psd(w, h, 4, [red, green, blue, alpha], true));
        assert.deepEqual([...out.data.slice(4, 8)], [20, 2, 100, 128]);
        assert.deepEqual([...out.data.slice(20, 24)], [60, 6, 100, 255]);
    });

    it('ImageImporter returns real PSD pixels', async () => {
        const image = await ImageImporter.shared.decode(psd(w, h, 3, [red, green, blue]), { filename: 'x.psd' });
        assert.equal(image.format, 'psd');
        assert.deepEqual([...image.data.slice(0, 4)], [10, 1, 100, 255]);
    });
});
