use compositor_core::layer::BlendMode;
use compositor_render::blend::blend_pixels_simd;
use compositor_render::tile::{TileCoord, TileMap, TILE_BYTES, TILE_SIZE};

#[test]
fn test_simd_blend_normal() {
    let mut dest = vec![100u8, 100, 100, 255];
    let src = vec![200u8, 200, 200, 255];

    blend_pixels_simd(&mut dest, &src, 1.0, BlendMode::Normal);
    assert_eq!(dest, vec![200, 200, 200, 255]);
}

#[test]
fn test_simd_blend_multiply() {
    let mut dest = vec![255u8, 255, 255, 255]; // white
    let src = vec![128u8, 128, 128, 255];      // 50% gray

    blend_pixels_simd(&mut dest, &src, 1.0, BlendMode::Multiply);
    assert_eq!(dest[0], 128);
    assert_eq!(dest[1], 128);
    assert_eq!(dest[2], 128);
}

#[test]
fn test_tilemap_sparse_allocation() {
    let mut map = TileMap::new(1024, 1024);
    assert_eq!(map.active_tile_count(), 0);

    let tile = map.get_or_create_tile_mut(TileCoord::new(0, 0));
    tile.data[0] = 255;

    assert_eq!(map.active_tile_count(), 1);
    assert_eq!(map.get_tile(TileCoord::new(0, 0)).unwrap().data[0], 255);
}
