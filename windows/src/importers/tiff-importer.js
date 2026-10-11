/**
 * TIFF Importer & Exporter for Compositor (Windows)
 * Uses WASM/pure-JS UTIF engine to decode and encode TIFF images with full IFD support.
 */

const UTIF = require('utif');

/**
 * Checks whether a buffer has TIFF magic bytes (Little-Endian or Big-Endian).
 */
function isTIFF(buffer) {
    if (!buffer || buffer.length < 4) return false;
    const b0 = buffer[0], b1 = buffer[1], b2 = buffer[2], b3 = buffer[3];
    // Little-endian: 'II' (0x49 0x49) followed by 42 (0x2A 0x00)
    if (b0 === 0x49 && b1 === 0x49 && b2 === 0x2A && b3 === 0x00) return true;
    // Big-endian: 'MM' (0x4D 0x4D) followed by 42 (0x00 0x2A)
    if (b0 === 0x4D && b1 === 0x4D && b2 === 0x00 && b3 === 0x2A) return true;
    return false;
}

/**
 * Decodes a TIFF buffer into RGBA pixel data, width, height, and metadata.
 */
function decodeTIFF(buf) {
    const buffer = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
    if (!isTIFF(buffer)) {
        throw new Error('Invalid TIFF: missing magic byte signature');
    }

    const ifds = UTIF.decode(buffer);
    if (!ifds || ifds.length === 0) {
        throw new Error('TIFF decoding failed: no Image File Directories (IFD) found');
    }

    const firstIFD = ifds[0];
    UTIF.decodeImage(buffer, firstIFD);

    const width = firstIFD.width || (firstIFD.t256 ? firstIFD.t256[0] : 0);
    const height = firstIFD.height || (firstIFD.t257 ? firstIFD.t257[0] : 0);

    if (width <= 0 || height <= 0) {
        throw new Error('TIFF decoding failed: invalid dimensions');
    }

    const rgba = UTIF.toRGBA8(firstIFD);
    const orientation = firstIFD.t274 ? firstIFD.t274[0] : 1;
    const dpiX = firstIFD.t282 ? (Array.isArray(firstIFD.t282) ? firstIFD.t282[0] : firstIFD.t282) : 72;
    const dpiY = firstIFD.t283 ? (Array.isArray(firstIFD.t283) ? firstIFD.t283[0] : firstIFD.t283) : 72;

    return {
        width,
        height,
        data: new Uint8ClampedArray(rgba.buffer, rgba.byteOffset, rgba.byteLength),
        orientation: orientation || 1,
        dpi: Math.round(dpiX) || 72,
        format: 'image/tiff'
    };
}

/**
 * Encodes RGBA pixels into a TIFF file buffer.
 */
function encodeTIFF(rgbaData, width, height) {
    if (!rgbaData || width <= 0 || height <= 0) {
        throw new Error('Invalid parameters for TIFF encoding');
    }
    const uint8 = rgbaData instanceof Uint8Array ? rgbaData : new Uint8Array(rgbaData);
    const tiffArrayBuffer = UTIF.encodeImage(uint8, width, height);
    return Buffer.from(tiffArrayBuffer);
}

module.exports = {
    isTIFF,
    decodeTIFF,
    encodeTIFF
};
