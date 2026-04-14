# Implementation Plan: Pixel Animator V2 — The Professional Update

This plan outlines the next evolution of Pixel Animator, moving beyond basic drawing to a high-speed, professional-grade creative environment that anticipates the workflow needs of serious pixel artists and animators.

## 1. Advanced Creative Tools

### ✦ Dither Tool & Custom Brushes
-   **Innovation**: Specialized brushes for dither patterns and the ability to define "brush patterns" from selections.
-   **Artist Value**: Essential for GBA-style shading and texture consistency in character sprites.

### ✦ Pixel-Perfect Stroke Smoothing
-   **Innovation**: An algorithm that detects and removes "double pixels" on corners during fast freehand drawing.
-   **Artist Value**: Industrial standard for clean, "crunchy" line art favored in Pokemon-style monster designs.

### ✦ Real-time Symmetry (Mirror Mode)
-   **Innovation**: Global horizontal/vertical symmetry axes with visual guides that mirror drawing in real-time.
-   **Artist Value**: Drastically speeds up front-facing character and UI component design (like Spotify player backgrounds).

### ✦ Tiled Mode & Tile Splicing
-   **Innovation**: 3x3 repeating preview for textures and a "Slice Export" that automatically breaks a large sheet into 16x16 or 32x32 tiles.
-   **Artist Value**: Critical for game map tilesets and modular UI assets.

### ✦ Reference Layer
-   **Innovation**: A "ghost" layer that sits above or below the canvas, allowing users to import a standard image at low opacity. This layer is excluded from exports.
-   **Artist Value**: Streamlines the process of rotoscoping or using concept art as a guide.

## 2. Animation & Workflow Excellence

### ✦ Frame Tagging & Loop Sections
-   **Innovation**: Grouping frames into named tags (e.g., "Idle," "Walk," "Attack") with independent loop settings and playback speeds for each tag.
-   **Artist Value**: Standard for game animation pipelines; allows testing specific animation states without exporting the whole sheet.

### ✦ Dynamic Onion Skinning (Depth of Time)
-   **Innovation**: Configurable tinting (Red for previous, Green for future) with customizable opacity curves across multiple frames.
-   **Artist Value**: Provides the "Industry Standard" visual logic for complex movement and sub-pixel animation.

### ✦ Palette Lock & Indexing
-   **Innovation**: A mode where the canvas becomes strictly indexed to the current palette. Changing a color in the palette instantly updates every pixel on the canvas using that index.
-   **Artist Value**: Allows for rapid iteration on color schemes without re-drawing.

### ✦ Keyboard Macro System
-   **Innovation**: Context-sensitive shortcuts for fast layer navigation (e.g., `[` and `]` for layer up/down) and frame navigation (`<` and `>`).
-   **Artist Value**: Enables a "hands-off-mouse" workflow for rapid testing.

## 3. Storage & Export Innovation

### ✦ Session Recovery (Auto-Save)
-   **Innovation**: LocalStorage-based snapshotting that saves the project state every 60 seconds or on canvas changes.
-   **Artist Value**: Protects work against browser crashes or accidental refreshes.

### ✦ Layered Project Format (.pxl)
-   **Innovation**: A custom JSON-based format that stores all layers, frames, and project metadata (naming, palette, onion skin settings) in a single file.
-   **Artist Value**: Allows artists to save and resume complex projects without losing layer data.

## Implementation Phases

### Phase 1: Industry Foundation
-   [x] Implement Pixel-Perfect Brush Smoothing.
-   [x] Add Frame Tagging and playback range selection.
-   [x] Expand Layer capabilities (Reference Layer, Opacity).

### Phase 2: Pro Art Tools
-   [x] Implement Real-time Symmetry (Mirror Axes).
-   [x] Develop the Dither & Pattern Brush system.
-   [x] Add Automatic Tile Slicing for exports.

### Phase 3: GBA Optimization & Delivery
-   [x] Implement Palette Indexing and GBA Palette Presets.
-   [x] Create the `.pxl` Layered Project Export/Import.
-   [x] Finalize UI for "Spotify Minimalist" workflow.

---

> [!NOTE]
> **Why V2?** 
> V1 was about drawing. V2 is about **Productivity**. By anticipating the need for tile-ability, dither-shading, and non-destructive reference guides, we move from being a simple editor to a professional creative tool.
