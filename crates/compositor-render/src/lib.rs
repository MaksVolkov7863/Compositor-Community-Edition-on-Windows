//! High-performance rendering pipeline, SIMD blending, and tile engine.

pub mod blend;
pub mod filters;
pub mod tile;

pub use blend::blend_pixels_simd;
pub use tile::{Tile, TileCoord, TileMap, TILE_SIZE};
