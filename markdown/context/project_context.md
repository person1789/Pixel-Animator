# Pixel Animator Project Context

This directory contains architectural and feature context for the Pixel Animator project.

## Project Structure
- `js/tools/`: Drawing tool logic.
- `js/canvas/`: Rendering and coordinate mapping.
- `js/animation/`: Timeline, playback, and onion skinning.
- `js/io/`: Import/Export logic.

## Feature Goals (from Sketch)
1. **Fix Ellipse**: Migrate to Midpoint Ellipse Algorithm for pixel-perfect results.
2. **Intelligent Zoom**: Implement scroll-zoom that centers on the cursor but snaps to fit the screen when zooming out.
3. **Advanced Preview**:
    - **Resolution**: Options to change preview scale.
    - **Layout**: "Preview Mode" toggle for a larger focal point.
    - **Delete Frame**: Backspace key integration for active frame deletion in the timeline.
