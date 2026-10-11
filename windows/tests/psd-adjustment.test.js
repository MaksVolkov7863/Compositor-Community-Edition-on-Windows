const { describe, it } = require('node:test');
const assert = require('node:assert');
const { PSDAdjustments } = require('../src/psd-reader');

describe('PSD Adjustment Layer Decoding Pipeline (Mac PSDAdjustmentTests Parity)', () => {
    it('Levels gamma is stored in hundredths and decodes accurately into range fractions', () => {
        // Build 10-byte range: [black: 2, white: 254, outBlack: 0, outWhite: 255, gamma: 100]
        const buf = Buffer.alloc(20);
        buf.writeUInt16BE(2, 0);
        buf.writeUInt16BE(254, 2);
        buf.writeUInt16BE(0, 4);
        buf.writeUInt16BE(255, 6);
        buf.writeUInt16BE(100, 8); // gamma 1.00

        const levels = PSDAdjustments.levels(buf);
        assert.ok(levels && levels.levels);
        const r0 = levels.levels.ranges[0];
        assert.equal(r0.black, 2);
        assert.equal(r0.white, 254);
        assert.equal(r0.outputBlack, 0);
        assert.equal(r0.outputWhite, 255);
        assert.equal(r0.gamma, 1.0);
    });

    it('Hue/Saturation reads master adjustment and color bands accurately', () => {
        // [version: 2 (2 bytes), colorize: 0 (1 byte), padding (1 byte), dummy (2 bytes), masterHue: 5, masterSat: 4, masterLight: 0]
        const buf = Buffer.alloc(30);
        buf.writeUInt16BE(2, 0); // version 2
        buf.writeUInt8(0, 2);    // colorize off
        buf.writeInt16BE(5, 6);  // master hue
        buf.writeInt16BE(4, 8);  // master sat
        buf.writeInt16BE(0, 10); // master light

        // Reds band: [fStart: 315, rStart: 345, rEnd: 15, fEnd: 45, hue: 0, sat: -30, light: 10]
        buf.writeInt16BE(315, 12);
        buf.writeInt16BE(345, 14);
        buf.writeInt16BE(15, 16);
        buf.writeInt16BE(45, 18);
        buf.writeInt16BE(0, 20);
        buf.writeInt16BE(-30, 22);
        buf.writeInt16BE(10, 24);

        const hue = PSDAdjustments.hue(buf);
        assert.ok(hue && hue.hsvSettings);
        assert.equal(hue.hsvSettings.colorize, false);
        assert.equal(hue.hsvSettings.adjustments.master.hue, 5);
        assert.equal(hue.hsvSettings.adjustments.master.saturation, 4);
        assert.equal(hue.hsvSettings.adjustments.reds.saturation, -30);
        assert.equal(hue.hsvSettings.adjustments.reds.lightness, 10);
        assert.equal(hue.hsvSettings.bands.reds.rangeStart, 345);
        assert.equal(hue.hsvSettings.bands.reds.rangeEnd, 15);
    });
});
