const { describe, it } = require('node:test');
const assert = require('node:assert');
const { PSDReader, PSDFixture } = require('../src/psd-reader');

describe('Photoshop Large Document (PSB) Binary Import Pipeline (Mac PSBImportTests Parity)', () => {
    it('PSB binary format round-trip matches PSD layer structure and names', () => {
        const sourceDoc = {
            width: 10,
            height: 8,
            resolution: 144,
            layers: [
                { name: 'Red Base', bounds: { x: 0, y: 0, width: 6, height: 4 }, opacity: 1.0 },
                { name: 'Green Mid', bounds: { x: 2, y: 2, width: 4, height: 6 }, opacity: 0.8 },
                { name: 'Blue Top', bounds: { x: 4, y: 4, width: 4, height: 4 }, opacity: 0.5 }
            ]
        };

        const psdData = PSDFixture.data(sourceDoc, { isPSB: false });
        const psbData = PSDFixture.data(sourceDoc, { isPSB: true });

        const psd = PSDReader.read(psdData);
        const psb = PSDReader.read(psbData);

        assert.equal(psd.version, 1);
        assert.equal(psd.isPSB, false);

        assert.equal(psb.version, 2);
        assert.equal(psb.isPSB, true);

        assert.equal(psb.layers.length, psd.layers.length);
        assert.deepEqual(psb.layers.map(l => l.name), psd.layers.map(l => l.name));
        assert.deepEqual(psb.layers.map(l => l.bounds), psd.layers.map(l => l.bounds));
        assert.deepEqual(psb.layers.map(l => l.opacity), psd.layers.map(l => l.opacity));
    });

    it('PSB parser handles large dimension attributes without integer overflow', () => {
        const header = Buffer.alloc(26);
        header.write('8BPS', 0, 'utf8');
        header.writeUInt16BE(2, 4); // PSB version 2
        header.writeUInt16BE(3, 12); // 3 channels
        header.writeUInt32BE(40000, 14); // 40,000 height
        header.writeUInt32BE(50000, 18); // 50,000 width
        header.writeUInt16BE(8, 22);
        header.writeUInt16BE(3, 24);

        const colorMode = Buffer.alloc(4);
        const res = Buffer.alloc(4);
        const layerSec = Buffer.alloc(8); // 64-bit zero len
        const imgData = Buffer.alloc(2);

        const buf = Buffer.concat([header, colorMode, res, layerSec, imgData]);
        const doc = PSDReader.read(buf);

        assert.equal(doc.version, 2);
        assert.equal(doc.isPSB, true);
        assert.equal(doc.width, 50000);
        assert.equal(doc.height, 40000);
    });
});
