# Implementation Plan: V1 Feature Group

This plan details the implementation of the features requested in the [V1 Features Plan](file:///c:/Users/ajayp/Desktop/Pixel%20Animator/context/V1_features_implementation_plan.md).

## Proposed Changes

### 1. Pixel-Perfect Ellipse Tool
Migrate the ellipse drawing logic to the Midpoint Ellipse Algorithm to eliminate gaps and ensure symmetry.

#### [MODIFY] [ellipse.js](file:///c:/Users/ajayp/Desktop/Pixel%20Animator/js/tools/ellipse.js)
- Implement `_drawEllipse` using the Midpoint algorithm.
- Add horizontal scanline filling logic for "filled" shape mode.

---

### 2. Intelligent Hybrid Zoom System
Refactor the zoom behavior to be cursor-centric at high zoom levels and screen-centric at low zoom levels.

#### [MODIFY] [state.js](file:///c:/Users/ajayp/Desktop/Pixel%20Animator/js/state.js)
- Add utility for calculating zoom offsets.
- Implement constraints and auto-centering logic.

#### [MODIFY] [app.js](file:///c:/Users/ajayp/Desktop/Pixel%20Animator/js/app.js)
- Update `wheel` event handler to calculate stable coordinates under the cursor.

---

### 3. Preview Layout & Resolution
Add UI controls for preview scaling and a layout toggle for "Preview Mode."

#### [MODIFY] [index.html](file:///c:/Users/ajayp/Desktop/Pixel%20Animator/index.html)
- Add "Preview Mode" toggle button.
- Add resolution dropdown (0.5x, 1x, 2x, 4x, 8x, Fit).

#### [MODIFY] [index.css](file:///c:/Users/ajayp/Desktop/Pixel%20Animator/index.css)
- Implement the `.layout-preview-mode` class to swap grid/sidebar priorities.
- Add styling for the new controls.

#### [MODIFY] [playback.js](file:///c:/Users/ajayp/Desktop/Pixel%20Animator/js/animation/playback.js)
- Update `_renderPreview` to support scaling and "Fit to Window" calculations.

---

### 4. Frame Deletion Workflow
Enable rapid frame deletion using the Backspace key.

#### [MODIFY] [app.js](file:///c:/Users/ajayp/Desktop/Pixel%20Animator/js/app.js)
- Add `Backspace` and `Delete` keyboard shortcuts.

#### [MODIFY] [timeline.js](file:///c:/Users/ajayp/Desktop/Pixel%20Animator/js/animation/timeline.js)
- Refine `deleteFrame` to maintain valid selection and push to history.

## Verification Plan

### Automated Tests
- None.

### Manual Verification
- **Ellipse**: Verify no gaps at various radii.
- **Zoom**: Verify cursor stability at 400% zoom and centering at 50% zoom.
- **Preview**: Toggle layout and verify resolution scaling.
- **Deletion**: Delete multiple frames and verify undo/redo stability.
