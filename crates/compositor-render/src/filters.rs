//! Fast image processing filters and adjustments.

pub fn invert(pixels: &mut [u8]) {
    for chunk in pixels.chunks_exact_mut(4) {
        chunk[0] = 255 - chunk[0];
        chunk[1] = 255 - chunk[1];
        chunk[2] = 255 - chunk[2];
    }
}

pub fn adjust_brightness_contrast(pixels: &mut [u8], brightness: f32, contrast: f32) {
    let factor = (259.0 * (contrast * 255.0 + 255.0)) / (255.0 * (259.0 - contrast * 255.0));
    for chunk in pixels.chunks_exact_mut(4) {
        for c in 0..3 {
            let val = chunk[c] as f32 + brightness * 255.0;
            let adjusted = factor * (val - 128.0) + 128.0;
            chunk[c] = adjusted.clamp(0.0, 255.0).round() as u8;
        }
    }
}
