# V2 Innovation Features Testing Guide

This document outlines test procedures for each implemented V2 feature. Run these tests in a browser to validate functionality.

## Core Art Refinement

### ✅ Pixel-Perfect Brush Smoothing
**Test Steps:**
1. Select the Pencil tool
2. Draw fast, curved lines with quick mouse movements
3. Verify no duplicate pixels appear in corners or overlaps
4. Check that lines remain 1 pixel wide without artifacts

### ✅ Symmetry Manager (Real-time Symmetry)
**Test Steps:**
1. Select the Mirror Pen tool (shortcut: M)
2. Choose horizontal, vertical, or both axes
3. Draw on one side of the canvas
4. Verify drawing mirrors in real-time to the opposite side(s)

### ✅ Dither Manager & Dither Tool
**Test Steps:**
1. Select the Dither tool (may need to add to UI)
2. Click on canvas to apply dither pattern
3. Verify Bayer matrix or ordered dither pattern is applied
4. Test on different colors to see dithering effect

## Animation Engine (Pro)

### ✅ Frame Tagging System
**Test Steps:**
1. Create multiple frames in timeline
2. Use code/API to create tags (e.g., `state.createTag('idle', 0, 2)`)
3. Verify tags are saved in project
4. Rename and delete tags via API

### ✅ Play Tag Loops
**Test Steps:**
1. Create a tag spanning multiple frames
2. Use `playback.playTag('tagName')`
3. Verify animation loops only within tag frame range
4. Test with different tags

### ✅ Depth-based Onion Skin Tinting
**Test Steps:**
1. Enable onion skin (O key)
2. Set frames before/after in state
3. Verify red tint for previous frames, blue for future
4. Switch `onionSkinCurve` between 'linear' and 'exponential'
5. Check opacity decreases appropriately

## Export & Game Pipelines

### ✅ Tile Splicer (Automatic Tile Slicing)
**Test Steps:**
1. Create a canvas divisible by 16x16 or 32x32 (e.g., 64x64)
2. Use `spriteSheetExporter.exportTiles({ tileSize: 16 })`
3. Verify individual PNG tiles are downloaded
4. Check tile naming: `tile_f{frame}_x{x}_y{y}.png`

### ✅ .pxl Layered Project Saving
**Test Steps:**
1. Create project with layers, frames, tags
2. Save project (Ctrl+S)
3. Verify file downloads as `.pxl`
4. Load the .pxl file
5. Confirm all data (layers, tags, etc.) loads correctly

## Workflow Helpers

### ✅ Reference Layer Support
**Test Steps:**
1. Add reference layer: `layerManager.addReferenceLayer()`
2. Load image: `layerManager.loadImageForReferenceLayer(file)`
3. Set opacity on reference layer
4. Export sprite sheet or PNG
5. Verify reference layer is excluded from export

### ✅ Indexed Color Mode (Palette Lock)
**Test Steps:**
1. Enable indexed mode: `state.indexedMode = true`
2. Draw with colors from palette
3. Change a color in palette
4. Verify canvas pixels update instantly to new color
5. Export and check colors are correct

## Additional Features

### ✅ Keyboard Macro System
**Test Steps:**
1. Press `[` to move layer up
2. Press `]` to move layer down
3. Press `<` to go to previous frame
4. Press `>` to go to next frame
5. Verify layer/frame navigation works without mouse

### ✅ Session Recovery (Auto-Save)
**Test Steps:**
1. Make changes to project
2. Wait 60 seconds or refresh page
3. Check localStorage has 'pixelAnimatorAutoSave'
4. On reload, verify project state is recovered

### ✅ GBA Palette Presets
**Test Steps:**
1. Call `paletteManager.loadGBAPalette()`
2. Verify palette updates to GBA colors
3. Draw with new palette colors

## Testing Checklist

- [ ] All syntax checks pass (run `node -c` on modified files)
- [ ] No console errors when loading app
- [ ] Features integrate without breaking existing functionality
- [ ] Exports work correctly with new features
- [ ] Project save/load preserves all new data
- [ ] Keyboard shortcuts don't conflict
- [ ] Auto-save doesn't interfere with manual saves

## Notes

- Some features may require UI elements to be added for full testing
- Test in multiple browsers for compatibility
- Check performance with large canvases/animations
- Verify mobile/touch support if applicable