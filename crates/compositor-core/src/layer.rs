use crate::color::Color;
use crate::geometry::Rect;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

pub type LayerId = Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum BlendMode {
    Normal,
    Multiply,
    Screen,
    Overlay,
    Darken,
    Lighten,
    ColorDodge,
    ColorBurn,
    Difference,
    SoftLight,
    HardLight,
}

impl Default for BlendMode {
    fn default() -> Self {
        Self::Normal
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LayerKind {
    Raster {
        width: u32,
        height: u32,
    },
    VectorShape {
        fill_color: Color,
        shape_type: String,
    },
    LiveText {
        text: String,
        font_size: f64,
        font_family: String,
    },
    Group {
        children_ids: Vec<LayerId>,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Layer {
    pub id: LayerId,
    pub name: String,
    pub bounds: Rect,
    pub opacity: f32,
    pub blend_mode: BlendMode,
    pub visible: bool,
    pub locked: bool,
    pub clipping_mask: bool,
    pub kind: LayerKind,
}

impl Layer {
    pub fn new_raster(name: impl Into<String>, bounds: Rect, width: u32, height: u32) -> Self {
        Self {
            id: Uuid::new_v4(),
            name: name.into(),
            bounds,
            opacity: 1.0,
            blend_mode: BlendMode::Normal,
            visible: true,
            locked: false,
            clipping_mask: false,
            kind: LayerKind::Raster { width, height },
        }
    }
}
