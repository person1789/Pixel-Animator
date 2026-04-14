# Task: Implementation of V1 Features

## Feature 1: Pixel-Perfect Ellipse Tool
- [x] Implement Midpoint Ellipse Algorithm in `js/tools/ellipse.js`
- [x] Implement symmetry handling for all four quadrants
- [x] Support filled ellipses using horizontal scanlines
- [x] Verify no gaps and symmetric output

## Feature 2: Intelligent Hybrid Zoom System
- [x] Refactor zoom logic in `js/app.js` and `js/state.js`
- [x] Implement Threshold Detection (Threshold = 1.0)
- [x] Implement Cursor-Centric Zoom (≥ 100%)
- [x] Implement Screen-Centric Zoom (< 100%) with auto-centering
- [x] Verify smooth transitions and boundary constraints

## Feature 3: Preview Layout Mode
- [x] Update `index.html` and `index.css` for layout containers
- [x] Implement layout state toggle in `js/state.js`
- [x] Add toggle button and shortcut (`P`) in `js/app.js`
- [x] Verify layout swapping and aspect ratio maintenance

## Feature 4: Preview Resolution Control
- [x] Implement scaling presets (0.5x to 8x) and "Fit" mode in `js/animation/playback.js`
- [x] Add UI controls to the preview panel in `index.html`
- [x] Ensure nearest-neighbor scaling (crisp pixels)
- [x] Verify dynamic scaling on window resize

## Feature 5: Frame Deletion Workflow
- [x] Track selected frame in `Timeline`
- [x] Implement Backspace/Delete shortcut in `js/app.js`
- [x] Implement deletion logic in `js/animation/timeline.js` (ensure undoability)
- [x] Verify safety checks (prevent deleting last frame)
