use std::collections::HashMap;

pub const TILE_SIZE: usize = 256;
pub const TILE_BYTES: usize = TILE_SIZE * TILE_SIZE * 4;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct TileCoord {
    pub tx: i32,
    pub ty: i32,
}

impl TileCoord {
    pub fn new(tx: i32, ty: i32) -> Self {
        Self { tx, ty }
    }
}

pub struct Tile {
    pub data: Box<[u8; TILE_BYTES]>,
}

impl Tile {
    pub fn new_empty() -> Self {
        Self {
            data: Box::new([0u8; TILE_BYTES]),
        }
    }
}

pub struct TileMap {
    tiles: HashMap<TileCoord, Tile>,
    pub width: u32,
    pub height: u32,
}

impl TileMap {
    pub fn new(width: u32, height: u32) -> Self {
        Self {
            tiles: HashMap::new(),
            width,
            height,
        }
    }

    pub fn get_tile(&self, coord: TileCoord) -> Option<&Tile> {
        self.tiles.get(&coord)
    }

    pub fn get_or_create_tile_mut(&mut self, coord: TileCoord) -> &mut Tile {
        self.tiles.entry(coord).or_insert_with(Tile::new_empty)
    }

    pub fn active_tile_count(&self) -> usize {
        self.tiles.len()
    }
}
