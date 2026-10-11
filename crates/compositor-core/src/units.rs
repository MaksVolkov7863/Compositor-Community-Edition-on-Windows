use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum DocumentUnits {
    Pixels,
    Inches,
    Centimeters,
    Millimeters,
}

impl Default for DocumentUnits {
    fn default() -> Self {
        Self::Pixels
    }
}

pub struct UnitConverter {
    pub dpi: f64,
}

impl UnitConverter {
    pub fn new(dpi: f64) -> Self {
        Self {
            dpi: if dpi <= 0.0 { 72.0 } else { dpi },
        }
    }

    pub fn to_pixels(&self, value: f64, units: DocumentUnits) -> f64 {
        match units {
            DocumentUnits::Pixels => value,
            DocumentUnits::Inches => value * self.dpi,
            DocumentUnits::Centimeters => (value / 2.54) * self.dpi,
            DocumentUnits::Millimeters => (value / 25.4) * self.dpi,
        }
    }

    pub fn from_pixels(&self, pixels: f64, target: DocumentUnits) -> f64 {
        match target {
            DocumentUnits::Pixels => pixels,
            DocumentUnits::Inches => pixels / self.dpi,
            DocumentUnits::Centimeters => (pixels / self.dpi) * 2.54,
            DocumentUnits::Millimeters => (pixels / self.dpi) * 25.4,
        }
    }
}
