# Pixel Animator Implementation Plan

## Executive Summary
Implementation roadmap for three major feature groups: Ellipse Tool correction, Intelligent Zoom behavior, and Enhanced Preview/Frame Management systems.

---

## Feature 1: Pixel-Perfect Ellipse Tool

### Current State
Current ellipse implementation generates discontinuous pixel boundaries, creating visual gaps particularly at quadrant boundaries (45-degree angles) and with certain radii combinations.

### Implementation Strategy
**Phase 1: Algorithm Migration**
- Replace current rasterization method with Midpoint Ellipse Algorithm
- Implement dual-region plotting (Region 1: slope > -1, Region 2: slope < -1)
- Add symmetry handling for all four quadrants

**Phase 2: Edge Case Handling**
- Handle degenerate cases (radius = 0, radius = 1)
- Optimize for axis-aligned vs. non-axis-aligned ellipses
- Implement anti-aliasing toggle (optional future enhancement)

**Phase 3: Integration**
- Connect to existing tool state management
- Maintain compatibility with current stroke/fill options
- Preserve undo/redo history compatibility

### Acceptance Criteria
- [ ] Ellipse outlines contain zero gaps at any zoom level
- [ ] Generated pixels are symmetric across both horizontal and vertical axes
- [ ] Performance remains >60fps for ellipses up to 500px radius
- [ ] Tool produces identical results regardless of drawing direction (left-to-right vs. right-to-left)

### Testing Conditions
1. **Visual Regression**: Compare output against reference images for radii (5,5), (10,5), (20,20), (100,50)
2. **Stress Test**: Rapid ellipse creation at maximum canvas size without frame drops
3. **Boundary Test**: Minimum radius (1px) and maximum reasonable radius (1000px)
4. **Aspect Ratio Test**: Extreme ratios (1:10, 10:1) to verify algorithm stability

---

## Feature 2: Intelligent Hybrid Zoom System

### Current State
Zoom is strictly cursor-centric, causing users to lose the grid when zooming out significantly.

### Implementation Strategy
**Phase 1: Zoom Mode Detection**
- Implement threshold detection (scale = 1.0 as boundary)
- Create state machine: CURSOR_CENTRIC ↔ SCREEN_CENTRIC
- Track zoom direction (in vs. out) to trigger mode transitions

**Phase 2: Cursor-Centric Mode (Zoom ≥ 100%)**
- Maintain existing behavior: mouse position anchors to same logical pixel
- Calculate offset deltas based on scale ratios
- Preserve exact pixel under cursor

**Phase 3: Screen-Centric Mode (Zoom < 100%)**
- Calculate optimal offset to maximize visible grid area
- Implement "gravity" toward center when content is smaller than viewport
- Prevent dead space (ensure grid touches at least two viewport edges when smaller than screen)
- Smooth transition animation when switching modes (300ms ease-out)

**Phase 4: Constraint System**
- Implement boundary detection to prevent losing grid off-screen
- Minimum zoom hard limit: 10% or grid fills viewport, whichever comes first
- Maximum zoom hard limit: 5000%

### Acceptance Criteria
- [ ] Zooming in (>100%): Cursor remains fixed over the same pixel coordinate
- [ ] Zooming out (<100%): Grid automatically centers when smaller than viewport
- [ ] Zooming out (<100%): Grid aligns to viewport edges when larger than viewport (no empty space beyond grid edges)
- [ ] Transition between modes occurs without visible jump or glitch
- [ ] Panning remains possible at all zoom levels

### Testing Conditions
1. **Zoom Sequence Test**: Rapid alternate zoom in/out 20 times, verify grid remains accessible
2. **Edge Loss Prevention**: Zoom out from corner of grid, verify grid doesn't disappear off-screen
3. **Transition Smoothness**: Measure animation frame drops during mode switch (target: 0 dropped frames)
4. **Resize Test**: Change browser window size at various zoom levels, verify adaptive recentering
5. **Precision Test**: Click specific pixel, zoom to 500%, click same pixel, verify coordinate match

---

## Feature 3: Preview Layout Mode Toggle

### Current State
Static layout with fixed grid/preview ratio. Users need flexibility to focus on either editing or previewing.

### Implementation Strategy
**Phase 1: Layout Architecture**
- Refactor UI into two primary containers: `grid-viewport` and `preview-viewport`
- Implement flexbox/grid CSS architecture supporting dynamic ratio changes
- Create layout state manager (Default vs. Preview modes)

**Phase 2: Default Mode**
- Grid viewport: 75% of available space
- Preview viewport: 25% of available space
- Grid remains interactive and editable

**Phase 3: Preview Mode**
- Swap ratios: Preview 75%, Grid 25%
- Implement "minimized grid" view (still interactive but compact)
- Maintain aspect ratios to prevent distortion

**Phase 4: State Management**
- Toggle button implementation (icon swap: maximize ↔ minimize)
- Keyboard shortcut (optional: Tab or `P` key)
- Persistence: Save last used mode to localStorage

### Acceptance Criteria
- [ ] Toggle instantly swaps primary focus between Grid and Preview
- [ ] Both canvases maintain correct aspect ratios during transition
- [ ] Active tool remains functional in both modes
- [ ] Animation playback continues uninterrupted during layout switch
- [ ] Transition animation completes within 300ms

### Testing Conditions
1. **Toggle Stress**: Rapidly switch modes 50 times, check for memory leaks
2. **Playback Continuity**: Start animation, toggle mode mid-playback, verify no stutter
3. **Interaction Test**: Draw in grid mode, toggle to preview mode, toggle back, verify tool still active
4. **Responsive Test**: Toggle modes at various window sizes (mobile, tablet, desktop)
5. **State Persistence**: Refresh page after setting Preview Mode, verify restoration

---

## Feature 4: Preview Resolution Control

### Current State
Preview renders at fixed 1:1 or automatic scaling without user control options.

### Implementation Strategy
**Phase 1: Resolution Presets**
- Implement scaling options: 0.5x, 1x, 2x, 4x, 8x, "Fit to Window"
- Use nearest-neighbor scaling to preserve pixel art sharpness
- Prevent bilinear filtering/blurring

**Phase 2: UI Controls**
- Dropdown or segmented button group in preview panel
- Current scale indicator
- "Fit" mode calculates largest integer scale that fits container

**Phase 3: Dynamic Scaling**
- Recalculate scale on window resize when in "Fit" mode
- Maintain selected scale when switching Layout Modes (unless switching to Fit)

### Acceptance Criteria
- [ ] Preview displays crisp pixels (no interpolation blur) at all integer scales
- [ ] "Fit" mode automatically selects largest integer scale ≤ container size
- [ ] Non-integer scales (0.5x) use proper pixel sampling (no fractional pixel bleeding)
- [ ] Scale persists per session (optional: per project)

### Testing Conditions
1. **Visual Quality**: Verify no blur at 2x, 4x, 8x scales (pixel edges remain sharp)
2. **Fit Calculation**: Resize window to 300px, 600px, 900px widths, verify integer math correctness
3. **Performance**: Switch to 8x on large animations (100+ frames), verify playback remains 30fps+
4. **Consistency**: Verify preview matches export output at equivalent scales

---

## Feature 5: Frame Deletion Workflow

### Current State
No quick keyboard method for deleting frames; likely requires right-click menu or button click.

### Implementation Strategy
**Phase 1: Selection State**
- Track "selected frame" in timeline (distinct from "current playing frame")
- Visual highlight for selected frame (border, overlay, or opacity change)
- Click-to-select behavior on timeline thumbnails

**Phase 2: Deletion Logic**
- Backspace/Delete key handler (global when timeline focused)
- Safety check: Prevent deletion if only one frame remains
- Confirmation dialog for destructive action (optional based on UX preference)

**Phase 3: Selection Management**
- After deletion: Select previous frame (or next if deleting first)
- Update timeline indices to prevent off-by-one errors
- Maintain animation continuity (adjust total duration)

**Phase 4: Undo Integration**
- Ensure deletion is undoable (push to command stack)
- Restore frame with original index if possible

### Acceptance Criteria
- [ ] Backspace key deletes currently selected timeline frame
- [ ] Application prevents deletion of final remaining frame (disable or alert)
- [ ] After deletion, timeline selection automatically moves to valid adjacent frame
- [ ] Deletion is undoable (Ctrl+Z restores frame)
- [ ] No data corruption in frame indices after multiple deletions

### Testing Conditions
1. **Deletion Sequence**: Create 5 frames, delete middle (3rd), delete first, delete last, verify indices correct
2. **Safety Lock**: Attempt to delete only remaining frame, verify prevention
3. **Undo/Redo**: Delete frame, undo, redo, undo, verify stability
4. **Keyboard Focus**: Test backspace works when canvas focused vs. timeline focused (define behavior)
5. **Rapid Fire**: Delete 10 frames rapidly (simulating user correction), verify no crashes

---

## Implementation Timeline

**Week 1**
- Days 1-2: Ellipse Tool algorithm implementation and testing
- Days 3-4: Zoom system refactoring and mode transitions
- Day 5: Integration testing between ellipse and zoom

**Week 2**
- Days 1-2: Layout Mode toggle and responsive design
- Days 3-4: Preview resolution controls and scaling logic
- Days 5: Frame deletion system and keyboard handlers

**Week 3**
- Days 1-2: End-to-end testing of all features
- Days 3-4: Edge case fixes and performance optimization
- Day 5: Documentation and user acceptance testing

---

## Risk Mitigation

1. **Ellipse Algorithm Complexity**: Maintain fallback to current tool if performance issues arise
2. **Zoom State Corruption**: Implement "Reset View" button as emergency escape
3. **Layout Reflow Performance**: Use CSS containment to prevent layout thrashing
4. **Accidental Deletion**: Consider 500ms undo toast notification instead of confirmation dialog
