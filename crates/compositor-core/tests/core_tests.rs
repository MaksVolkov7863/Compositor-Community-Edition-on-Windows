use compositor_core::color::{Color, Rgba8, RgbaF32};
use compositor_core::geometry::{Point, Rect, Size, Transform2D};
use compositor_core::layer::{BlendMode, Layer, LayerKind};
use compositor_core::units::{DocumentUnits, UnitConverter};

#[test]
fn test_geometry_rect_intersection() {
    let r1 = Rect::new(0.0, 0.0, 100.0, 100.0);
    let r2 = Rect::new(50.0, 50.0, 100.0, 100.0);
    let r3 = Rect::new(200.0, 200.0, 50.0, 50.0);

    assert!(r1.intersects(&r2));
    assert!(!r1.intersects(&r3));
}

#[test]
fn test_unit_converter_dpi() {
    let conv = UnitConverter::new(300.0);
    assert_eq!(conv.to_pixels(1.0, DocumentUnits::Inches), 300.0);
    assert_eq!(conv.from_pixels(300.0, DocumentUnits::Inches), 1.0);
}

#[test]
fn test_color_conversion_roundtrip() {
    let c = Rgba8::new(255, 128, 64, 255);
    let f = c.to_f32();
    let back = f.to_u8();
    assert_eq!(c, back);
}

#[test]
fn test_layer_creation() {
    let layer = Layer::new_raster("Background", Rect::new(0.0, 0.0, 800.0, 600.0), 800, 600);
    assert_eq!(layer.name, "Background");
    assert_eq!(layer.blend_mode, BlendMode::Normal);
    assert!(layer.visible);
}
