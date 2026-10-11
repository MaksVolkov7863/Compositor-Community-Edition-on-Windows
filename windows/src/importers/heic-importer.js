/**
 * HEIC / HEIF Importer for Compositor (Windows)
 * Uses WASM-powered libheif-js decoder to parse and rasterize High Efficiency Image Container files.
 */

let libheifModule = null;
try {
    libheifModule = require('libheif-js');
} catch (e) {
    // Graceful fallback if dependency is optional or missing
}

const HEIF_BRANDS = new Set([
    'heic', 'heix', 'heim', 'heis',
    'mif1', 'msf1', 'hevc', 'hevx',
    'avif', 'avis'
]);

/**
 * Checks whether buffer contains an ISOBMFF HEIF/HEIC container.
 */
function isHEIC(buf) {
    if (!buf || buf.length < 12) return false;
    const buffer = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);

    // Box type 'ftyp' at offset 4..7
    const ftyp = buffer.toString('ascii', 4, 8);
    if (ftyp !== 'ftyp') return false;

    // Major brand at 8..11
    const majorBrand = buffer.toString('ascii', 8, 12).toLowerCase();
    if (HEIF_BRANDS.has(majorBrand)) return true;

    // Check compatible brands in the rest of ftyp box (up to box length or 64 bytes)
    const boxSize = Math.min(buffer.readUInt32BE(0), Math.min(buffer.length, 64));
    for (let offset = 16; offset + 4 <= boxSize; offset += 4) {
        const brand = buffer.toString('ascii', offset, offset + 4).toLowerCase();
        if (HEIF_BRANDS.has(brand)) return true;
    }

    return false;
}

/**
 * Decodes a HEIC/HEIF file buffer to RGBA pixels.
 * Returns { width, height, data: Uint8ClampedArray, format: 'image/heic' }
 */
async function decodeHEIC(buf) {
    if (!libheifModule || !libheifModule.HeifDecoder) {
        throw new Error('libheif-js decoder module is not available');
    }

    const buffer = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
    if (!isHEIC(buffer)) {
        throw new Error('Invalid HEIC file: missing ftyp box or supported HEIF brand');
    }

    const decoder = new libheifModule.HeifDecoder();
    const images = decoder.decode(buffer);

    if (!images || images.length === 0) {
        throw new Error('Failed to decode HEIC: no readable images found in container');
    }

    // Prefer primary image if marked, otherwise first image
    let target = images.find(img => typeof img.is_primary === 'function' && img.is_primary()) || images[0];

    const width = target.get_width();
    const height = target.get_height();

    if (width <= 0 || height <= 0) {
        throw new Error(`Invalid HEIC dimensions: ${width}x${height}`);
    }

    return new Promise((resolve, reject) => {
        const outputImageData = {
            width,
            height,
            data: new Uint8ClampedArray(width * height * 4)
        };

        target.display(outputImageData, (result) => {
            if (!result || !result.data) {
                reject(new Error('HEIC pixel decoding failed'));
            } else {
                resolve({
                    width,
                    height,
                    data: result.data instanceof Uint8ClampedArray ? result.data : new Uint8ClampedArray(result.data),
                    format: 'image/heic'
                });
            }
        });
    });
}

module.exports = {
    isHEIC,
    decodeHEIC
};
