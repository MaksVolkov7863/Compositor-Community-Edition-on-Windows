use compositor_core::layer::BlendMode;

#[inline(always)]
fn blend_channel(base: f32, blend: f32, mode: BlendMode) -> f32 {
    match mode {
        BlendMode::Normal => blend,
        BlendMode::Multiply => base * blend,
        BlendMode::Screen => 1.0 - (1.0 - base) * (1.0 - blend),
        BlendMode::Overlay => {
            if base < 0.5 {
                2.0 * base * blend
            } else {
                1.0 - 2.0 * (1.0 - base) * (1.0 - blend)
            }
        }
        BlendMode::Darken => base.min(blend),
        BlendMode::Lighten => base.max(blend),
        BlendMode::Difference => (base - blend).abs(),
        BlendMode::ColorDodge => {
            if blend >= 1.0 {
                1.0
            } else {
                (base / (1.0 - blend)).min(1.0)
            }
        }
        BlendMode::ColorBurn => {
            if blend <= 0.0 {
                0.0
            } else {
                (1.0 - ((1.0 - base) / blend)).max(0.0)
            }
        }
        BlendMode::HardLight => {
            if blend < 0.5 {
                2.0 * base * blend
            } else {
                1.0 - 2.0 * (1.0 - base) * (1.0 - blend)
            }
        }
        BlendMode::SoftLight => {
            if blend <= 0.5 {
                base - (1.0 - 2.0 * blend) * base * (1.0 - base)
            } else {
                let d = if base <= 0.25 {
                    ((16.0 * base - 12.0) * base + 4.0) * base
                } else {
                    base.sqrt()
                };
                base + (2.0 * blend - 1.0) * (d - base)
            }
        }
    }
}

pub fn blend_pixels_simd(
    dest: &mut [u8],
    src: &[u8],
    opacity: f32,
    mode: BlendMode,
) {
    assert_eq!(dest.len(), src.len());
    let len = dest.len() / 4;

    for i in 0..len {
        let idx = i * 4;
        let sr = src[idx] as f32 / 255.0;
        let sg = src[idx + 1] as f32 / 255.0;
        let sb = src[idx + 2] as f32 / 255.0;
        let sa = (src[idx + 3] as f32 / 255.0) * opacity;

        if sa <= 0.0 {
            continue;
        }

        let dr = dest[idx] as f32 / 255.0;
        let dg = dest[idx + 1] as f32 / 255.0;
        let db = dest[idx + 2] as f32 / 255.0;
        let da = dest[idx + 3] as f32 / 255.0;

        let blended_r = blend_channel(dr, sr, mode);
        let blended_g = blend_channel(dg, sg, mode);
        let blended_b = blend_channel(db, sb, mode);

        let out_a = sa + da * (1.0 - sa);
        if out_a > 0.0 {
            let out_r = (blended_r * sa + dr * da * (1.0 - sa)) / out_a;
            let out_g = (blended_g * sa + dg * da * (1.0 - sa)) / out_a;
            let out_b = (blended_b * sa + db * da * (1.0 - sa)) / out_a;

            dest[idx] = (out_r.clamp(0.0, 1.0) * 255.0).round() as u8;
            dest[idx + 1] = (out_g.clamp(0.0, 1.0) * 255.0).round() as u8;
            dest[idx + 2] = (out_b.clamp(0.0, 1.0) * 255.0).round() as u8;
            dest[idx + 3] = (out_a.clamp(0.0, 1.0) * 255.0).round() as u8;
        }
    }
}
