use compositor-core::layer::Layer;
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::{Read, Write};
use std::path::Path;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum FormatError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("ZIP error: {0}")]
    Zip(#[from] zip::result::ZipError),
    #[error("JSON serialization error: {0}")]
    Json(#[from] serde_json::Error),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompManifest {
    pub version: u32,
    pub width: u32,
    pub height: u32,
    pub dpi: f64,
    pub layers: Vec<Layer>,
}

pub struct CompPackage;

impl CompPackage {
    pub const CURRENT_VERSION: u32 = 9;

    pub fn save(path: impl AsRef<Path>, manifest: &CompManifest) -> Result<(), FormatError> {
        let file = File::create(path)?;
        let mut zip = zip::ZipWriter::new(file);

        let options = zip::write::FileOptions::default()
            .compression_method(zip::CompressionMethod::Deflated);

        zip.start_file("manifest.json", options)?;
        let json_bytes = serde_json::to_vec_pretty(manifest)?;
        zip.write_all(&json_bytes)?;

        zip.finish()?;
        Ok(())
    }

    pub fn load(path: impl AsRef<Path>) -> Result<CompManifest, FormatError> {
        let file = File::open(path)?;
        let mut archive = zip::ZipArchive::new(file)?;

        let mut manifest_file = archive.by_name("manifest.json")?;
        let mut content = String::new();
        manifest_file.read_to_string(&mut content)?;

        let manifest: CompManifest = serde_json::from_str(&content)?;
        Ok(manifest)
    }
}
