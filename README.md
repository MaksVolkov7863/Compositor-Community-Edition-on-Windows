# Compositor (Windows Community Edition)

> [!NOTE]
> **Windows Community Edition**: Looking for the Windows build? Download ready-to-run installers and portable executables from **[Releases](https://github.com/MaksVolkov7863/Compositor-Community-Edition-on-Windows/releases)**!
> 
> Maintained by [@MaksVolkov7863](https://github.com/MaksVolkov7863). Features full cross-platform compatibility with macOS `.comp` projects up to **Manifest Version 9** (supporting formats 1–9 seamlessly).

---

The goal was to create a full-featured image editor that is completely free and open source. Built around the compositing and post-processing workflow needed to create a pixel-perfect final image.

Adobe Photoshop costs too much and tools like GIMP don’t feel familiar enough to stay in flow. That’s why Compositor was built.

---

## 🪟 Windows Edition Quick Start

- **Download**: Grab `Compositor-Setup-1.3.3.exe` (Installer) or `Compositor-1.3.3.exe` (Portable) from **[GitHub Releases](https://github.com/MaksVolkov7863/Compositor-Community-Edition-on-Windows/releases)**.
- **Project Format**: Fully compatible with macOS Compositor `.comp` project files up to Manifest Version 9.
- **Local Dev**:
  ```bash
  cd windows
  npm install
  npm start
  ```
- **Build Windows Executable**:
  ```bash
  cd windows
  npm run dist
  ```

---

## Installation

### Download
Get Compositor from [robbietilton.com/compositor](https://robbietilton.com/compositor), or download the latest release directly from [GitHub Releases](https://github.com/robbietilton/Compositor/releases/latest).

### Homebrew

```sh
brew install --cask robbietilton-compositor
```

## Features

### Layers
- Layers and folders, with opacity and Photoshop's full set of blend modes in its order — a folder's opacity dims everything inside it
- Layer masks: paint, fill, invert, blur and feather them anywhere on the canvas, past the layer's own pixels; link or unlink them to transform a mask on its own
- Clipping masks and folder masks
- Adjustment layers: Hue/Saturation, Levels, Curves, Exposure, Gradient Map, Grain, Black & White, Color Balance, Invert, Gaussian Blur, Motion Blur and Noise
- Layer effects: Stroke, Drop Shadow, Color Overlay, Inner Shadow, Outer Glow and Inner Glow, rendered on the GPU and editable at any time
- Merge Down, Merge Layers and Merge Group (⌘E)
- Duplicate, rename inline, reorder and nest by drag and drop; Option-drag to duplicate; a right-click menu in the Layers panel
- Copy and paste whole layers and folders (⌘C/⌘V with no selection), within a project or between projects, or drag them between projects

### Transform
- Non-destructive move, scale, rotate and flip — images keep their full resolution however small you make them
- Free distort (⌘-drag a handle), with Shift to lock to an axis
- Transform several layers, or a whole folder, together
- Snapping to canvas and layer edges and centers, with guides
- Exact values for position, size, scale and angle, stepped with the arrow keys
- Flip Layer and Flip Canvas, horizontal and vertical

### Selections
- Rectangle and Ellipse Marquee, Freehand and Polygonal Lasso, and the Magic tool — Wand selects by color, Object traces whatever you click (Tab switches)
- Select Subject (macOS via Apple Vision; Windows via AI background worker), and Expand, Contract and Feather on any selection
- Add to and subtract from selections, move the outline, or move and duplicate the pixels inside
- Load a layer's pixels or a mask as a selection
- Content-Aware Fill, which can also extend an image past its edges

### Painting and retouching
- Brush with size, hardness, opacity and smoothing, in Paint or Erase mode (B and E), and Shift for straight lines
- Spot Healing Brush (content-aware)
- Clone Stamp, aligned or not, sampling one layer or all of them
- Blur tool, on pixels or masks
- Gradient tool and Shape tool (rectangles, rounded rectangles, ellipses and lines), which stay editable rather than being rasterized
- Type tool (T): inline multiline editing in draggable, resizable paragraph boxes; font, size, color, alignment and spacing in the tool header; transform text and use it as a clipping mask
- Eyedropper and a full color picker

### Adjustments and filters
- Camera Raw filter: light, color, curves, color mixer, color grading, detail, optics and geometry, in a panel beside the canvas
- Levels (with Auto), Curves, Hue/Saturation, Exposure, Gradient Map, Grain, Black & White, Color Balance and Invert
- Gaussian Blur and Motion Blur that spread past a layer's edges
- Add Noise, Vignette, Bloom / Glow, Dither, Scanlines, Tonal Contrast, Lens Correction and Remove Background (macOS via Apple Vision; Windows via AI worker)
- Live previews, limited to the selection when there is one
- Last Filter (⌃⌘F) runs the last filter again with the same settings

### Canvas and files
- Multiple projects in tabs
- Search Commands (⌘F / Ctrl+F): find every menu command and tool by name, as in Raycast or Obsidian, and run it with Return
- Toggle Fullscreen (F): the canvas alone on black over the whole screen, with every panel put away; F or Esc brings them back
- Rulers (⌘R / Ctrl+R), guides dragged from them, a layout grid with adjustable spacing and subdivisions, and Snap To for guides, grid, layers and document bounds
- Crop with snapping, ratios including 3:4 and 9:16, and Option / Alt for symmetric cropping; with a selection, the crop starts at it
- Canvas Size, Image Size and Trim
- A Navigator minimap in the canvas's corner from 300% zoom: the whole document in small with a box around the view; click or drag to move there (View › Navigator)
- Sharp high-quality downsampling when zoomed out, and a pixel grid when zoomed in
- Import JPEG, PNG, WebP, SVG, and Photoshop PSD and PSB (Large Document, 8-bit RGB; not CMYK). Photoshop folders, masks, blend modes, fill rectangles/ellipses, and simple horizontal text stay editable; other vectors and vertical text become pixels. A conversion report is shown before anything is applied. *(macOS supports HEIC/TIFF via system ImageIO; Windows supports HEIC and TIFF via libheif-js and UTIF WASM decoders)*.
- Large documents: memory budget scaling, with oversized layers cropped cleanly to the canvas rectangle when needed
- Export PNG, Export JPEG, and Export As for PNG, JPEG or WebP at chosen scale, with live preview, JPEG quality and file size; Copy Merged
- Keep working while a project saves
- Photoshop-style keyboard shortcuts throughout, remappable in Edit > Keyboard Shortcuts
- Drag a number's label to scrub its value, as in Photoshop
- Automatic updates, signed and notarized

### Works with AI agents
- AI agents and scripts can build and edit projects directly: a `.comp` is a folder of PNG layers and a manifest, and an open project updates live as it's written. See [Writing Compositor projects](docs/writing-comp-files.md)

## Platforms

### Windows (Compositor for Windows - Community Edition)
A standalone desktop version with full feature parity for Windows 10 and 11, maintained by [@MaksVolkov7863](https://github.com/MaksVolkov7863):
- **Cross-Platform Compatibility**: Full support for `.comp` project files up to **Manifest Version 9** (including backward compatibility with versions 1–8). Projects saved on macOS open seamlessly in the Windows edition and vice versa.
- **Automated CI/CD Builds**: Continuous builds on GitHub Actions on every push to `main` and tagged releases (`v*`). Ready-to-run setup installers (`Compositor-Setup-1.3.3.exe`) and portable executables are available from [GitHub Releases](https://github.com/MaksVolkov7863/Compositor-Community-Edition-on-Windows/releases) and Artifacts.
- **Local Development**:
  ```bash
  cd windows
  npm install
  npm start
  ```
- **Automated Test Suite & Parity Guard**:
  ```bash
  cd windows
  npm test          # Runs all 61 test suites (221 unit and regression tests)
  npm run parity    # Verifies 100% upstream test suite and API coverage across all 79 macOS suites
  ```
- **Architectural Mapping**:
  - **GPU Compositing**: WebGL2 fragment shaders with CPU headless fallback (mirroring macOS Metal shaders).
  - **Vision Features**: Select Subject and Remove Background utilize an ONNX Web Runtime AI worker for local inference.
  - **File Formats**: Native support for PNG, JPEG, WebP, SVG, PSD (8-bit), and PSB Large Documents; WASM decoders for HEIC (libheif-js) and TIFF (UTIF) with full round-trip export.
- **Packaging (Windows .exe installer & portable)**:
  ```bash
  cd windows
  npm run dist
  ```

### macOS
- macOS 14+ / Xcode 16 or later (to build from source)
- Open `Compositor.xcodeproj` and run the **Compositor** scheme.
- Release DMG build script available in `scripts/release.sh`.

## License

MIT — see [LICENSE](LICENSE).

