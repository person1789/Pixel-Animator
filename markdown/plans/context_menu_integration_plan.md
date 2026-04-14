# Implementation Plan: Context Menu Integration

This plan details the completion of the Context Menu system by integrating it with the Layer and Timeline modules, enabling rapid access to common management tasks.

## Proposed Changes

### UI Infrastructure

#### [MODIFY] [context-menu.js](file:///c:/Users/ajayp/Desktop/Pixel%20Animator/js/ui/context-menu.js)
- Enhance `show` method to handle right-click events correctly (preventing default browser menu).
- Ensure positioning accounts for scroll offsets if applicable.

#### [MODIFY] [index.html](file:///c:/Users/ajayp/Desktop/Pixel%20Animator/index.html)
- Add a new modal dialog for renaming layers (`#rename-layer-dialog`).

---

### Layer Management Context Menu

#### [MODIFY] [layer-manager.js](file:///c:/Users/ajayp/Desktop/Pixel%20Animator/js/layers/layer-manager.js)
- Store `contextMenu` reference in the constructor.
- Update `renderUI` to bind `contextmenu` events to each `.layer-item`.
- Implement `renameLayer(index)` logic using a dedicated modal dialog:
    - Populate modal with current layer name.
    - Handle Save/Cancel actions.
- Define the context menu items for layers:
    - **Rename...**
    - **Duplicate Layer**
    - **Merge Down** (disabled if the bottom layer)
    - [Divider]
    - **Delete Layer** (danger style, disabled if only one layer remains)

---

### Timeline Management Context Menu

#### [MODIFY] [timeline.js](file:///c:/Users/ajayp/Desktop/Pixel%20Animator/js/animation/timeline.js)
- Update constructor to store `contextMenu`.
- Update `renderUI` to bind `contextmenu` events to each `.frame-thumb`.
- Define the context menu items for frames:
    - **Duplicate Frame**
    - **Delete Frame** (danger style, disabled if only one frame remains)
    - [Divider]
    - **Add New Frame**

---

## Verification Plan

### Manual Verification
1. **Layer Context Menu**:
    - Right-click any layer in the sidebar.
    - Verify all actions (Rename, Duplicate, Merge Down, Delete) perform correctly.
    - Verify "Delete" is disabled or ignored for the last layer.
    - Verify "Merge Down" is hidden or disabled for the bottom layer.
2. **Timeline Context Menu**:
    - Right-click any frame thumbnail in the timeline.
    - Verify actions (Duplicate, Delete, Add) perform correctly.
    - Verify "Delete" is disabled or ignored for the last frame.
3. **General UX**:
    - Left-clicking elsewhere should close the menu.
    - Clicking a menu item should close the menu.
    - Menu should never go off-screen.
