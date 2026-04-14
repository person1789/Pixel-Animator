/**
 * Central project state — the single source of truth.
 * The canvas is never the source of truth; this data model is.
 */
import { Events } from './events.js';

/**
 * Create a blank layer data array (RGBA, all transparent).
 */
export function createBlankLayerData(width, height) {
    return new Uint8ClampedArray(width * height * 4);
}

/**
 * Create a layer object.
 */
export function createLayer(name, width, height, type = 'normal') {
    return {
        name,
        visible: true,
        locked: false,
        opacity: 1.0,
        type,
        data: createBlankLayerData(width, height),
    };
}

/**
 * Create a frame object containing one or more layers.
 */
export function createFrame(width, height, layerName = 'Layer 1') {
    return {
        layers: [createLayer(layerName, width, height)],
        duration: 100, // ms per frame
    };
}

/**
 * Deep-clone a layer (copies pixel data).
 */
export function cloneLayer(layer) {
    return {
        ...layer,
        data: new Uint8ClampedArray(layer.data),
    };
}

/**
 * Deep-clone a frame (copies all layers).
 */
export function cloneFrame(frame) {
    return {
        ...frame,
        layers: frame.layers.map(cloneLayer),
    };
}

/**
 * Main application state.
 */
export class ProjectState {
    constructor(bus) {
        this.bus = bus;

        // Canvas dimensions (pixel-art resolution)
        this.canvasWidth = 32;
        this.canvasHeight = 32;
        this.maxCanvasSize = 256;

        // Frames & layers
        this.frames = [createFrame(32, 32)];
        this.currentFrameIndex = 0;
        this.currentLayerIndex = 0;

        // Frame tags
        this.tags = [];

        // Palette indexing
        this.indexedMode = false;

        // Tools
        this.activeTool = 'pencil';
        this.toolOptions = {
            brushSize: 1,
            mirrorAxis: 'horizontal', // horizontal | vertical | both
            selectionRect: null,       // { x, y, w, h } or null
            shapeMode: 'outline',      // outline | filled
        };

        // Colors (up to 3 slots)
        this.colors = [
            { r: 255, g: 255, b: 255, a: 255 }, // Slot 0 (Default Primary)
            { r: 0, g: 0, b: 0, a: 255 },       // Slot 1 (Default Secondary)
            { r: 255, g: 110, b: 89, a: 255 }    // Slot 2 (Default Tertiary/Accent)
        ];
        this.activeColorIndex = 0;

        // Viewport
        this.zoom = 16; // pixels on screen per art pixel
        this.panX = 0;
        this.panY = 0;
        this.showGrid = true;

        // Animation state
        this._currentFrameIndex = 0;
        this.selectedFrameIndex = 0;
        this.selectedLayerIndex = 0;
        this.isPlaying = false;
        
        // Settings
        this.showGrid = true;
        this.onionSkinEnabled = false;
        this.onionSkinFramesBefore = 2;
        this.onionSkinFramesAfter = 1;
        this.onionSkinCurve = 'linear';

        // Preview
        this.previewScale = 1; // 0.5, 1, 2, 4, 8, or 'fit'
        this.layoutPreviewMode = false;
        
        // Palette
        this.palette = this._defaultPalette();
    }

    // --- Convenience getters ---

    get currentFrame() {
        return this.frames[this.selectedFrameIndex];
    }

    get currentFrameIndex() {
        return this._currentFrameIndex;
    }

    setSelectedFrame(index, syncPlaying = true) {
        this.selectedFrameIndex = Math.max(0, Math.min(this.frames.length - 1, index));
        if (syncPlaying) {
            this._currentFrameIndex = this.selectedFrameIndex;
        }
        this.bus.emit(Events.FRAME_CHANGED, this.selectedFrameIndex);
        this.bus.emit(Events.CANVAS_REDRAW);
    }

    setCurrentPlayingFrame(index) {
        this._currentFrameIndex = Math.max(0, Math.min(this.frames.length - 1, index));
        this.bus.emit(Events.CANVAS_REDRAW); // Only redraw for playback
    }

    setSelectedLayer(index) {
        this.selectedLayerIndex = Math.max(0, Math.min(this.currentFrame.layers.length - 1, index));
        this.currentLayerIndex = this.selectedLayerIndex; // Sync drawing layer for now
        this.bus.emit(Events.LAYER_CHANGED, this.selectedLayerIndex);
        this.bus.emit(Events.CANVAS_REDRAW);
    }

    moveFrame(from, to) {
        if (from === to) return;
        const [frame] = this.frames.splice(from, 1);
        this.frames.splice(to, 0, frame);
        
        // Sync selection to followed item
        if (this.selectedFrameIndex === from) this.selectedFrameIndex = to;
        if (this._currentFrameIndex === from) this._currentFrameIndex = to;
        
        this.bus.emit(Events.FRAME_CHANGED);
        this.bus.emit(Events.CANVAS_REDRAW);
    }

    moveLayer(from, to) {
        const layers = this.currentFrame.layers;
        if (from === to) return;
        const [layer] = layers.splice(from, 1);
        layers.splice(to, 0, layer);
        
        // Sync selection to followed item
        if (this.selectedLayerIndex === from) this.selectedLayerIndex = to;
        this.currentLayerIndex = this.selectedLayerIndex;

        this.bus.emit(Events.LAYER_CHANGED);
        this.bus.emit(Events.CANVAS_REDRAW);
    }

    set currentFrameIndex(idx) {
        this._currentFrameIndex = idx;
    }

    get selectedFrame() {
        return this.frames[this.selectedFrameIndex];
    }

    get currentPlayingFrame() {
        return this.frames[this._currentFrameIndex];
    }

    get currentLayer() {
        return this.currentFrame.layers[this.currentLayerIndex];
    }

    get frameCount() {
        return this.frames.length;
    }

    get layerCount() {
        return this.currentFrame.layers.length;
    }

    // --- Pixel access ---

    getPixel(layerData, x, y) {
        if (x < 0 || x >= this.canvasWidth || y < 0 || y >= this.canvasHeight) return null;
        const i = (y * this.canvasWidth + x) * 4;
        if (this.indexedMode) {
            const index = layerData[i];
            if (index >= 0 && index < this.palette.length) {
                return this._hexToRgba(this.palette[index]);
            } else {
                return { r: 0, g: 0, b: 0, a: 0 };
            }
        } else {
            return {
                r: layerData[i],
                g: layerData[i + 1],
                b: layerData[i + 2],
                a: layerData[i + 3],
            };
        }
    }

    setPixel(layerData, x, y, color) {
        if (x < 0 || x >= this.canvasWidth || y < 0 || y >= this.canvasHeight) return;
        const i = (y * this.canvasWidth + x) * 4;
        if (this.indexedMode) {
            const hex = this._rgbaToHex(color.r, color.g, color.b);
            let index = this.palette.indexOf(hex);
            if (index === -1) {
                index = 0; // Default to first color if not in palette
            }
            layerData[i] = index;
            layerData[i + 1] = 0;
            layerData[i + 2] = 0;
            layerData[i + 3] = color.a;
        } else {
            layerData[i] = color.r;
            layerData[i + 1] = color.g;
            layerData[i + 2] = color.b;
            layerData[i + 3] = color.a;
        }
    }

    // --- Tag management ---

    createTag(name, startFrame, endFrame) {
        if (this.tags.some(tag => tag.name === name)) return false; // Name must be unique
        this.tags.push({ name, startFrame, endFrame });
        this.bus.emit(Events.TAGS_CHANGED);
        return true;
    }

    renameTag(index, newName) {
        if (index < 0 || index >= this.tags.length) return false;
        if (this.tags.some((tag, i) => i !== index && tag.name === newName)) return false;
        this.tags[index].name = newName;
        this.bus.emit(Events.TAGS_CHANGED);
        return true;
    }

    deleteTag(index) {
        if (index < 0 || index >= this.tags.length) return false;
        this.tags.splice(index, 1);
        this.bus.emit(Events.TAGS_CHANGED);
        return true;
    }

    getTagByName(name) {
        return this.tags.find(tag => tag.name === name);
    }

    // --- State mutation helpers (all emit events) ---

    setActiveTool(toolName) {
        this.activeTool = toolName;
        this.bus.emit(Events.TOOL_CHANGED, toolName);
    }

    get primaryColor() {
        return this.colors[this.activeColorIndex];
    }

    get secondaryColor() {
        // Return first non-active color
        return this.colors[(this.activeColorIndex + 1) % 3];
    }

    setActiveColorIndex(index) {
        this.activeColorIndex = Math.max(0, Math.min(2, index));
        this.bus.emit(Events.COLOR_CHANGED);
    }

    setPrimaryColor(color) {
        this.colors[this.activeColorIndex] = { ...color };
        this.bus.emit(Events.COLOR_CHANGED);
    }

    setSecondaryColor(color) {
        const idx = (this.activeColorIndex + 1) % 3;
        this.colors[idx] = { ...color };
        this.bus.emit(Events.COLOR_CHANGED);
    }

    swapColors() {
        const idxS = (this.activeColorIndex + 1) % 3;
        const tmp = this.colors[this.activeColorIndex];
        this.colors[this.activeColorIndex] = this.colors[idxS];
        this.colors[idxS] = tmp;
        this.bus.emit(Events.COLOR_CHANGED);
    }

    setCurrentFrame(index) {
        if (index < 0 || index >= this.frames.length) return;
        this.currentFrameIndex = index;
        // Clamp layer index
        if (this.currentLayerIndex >= this.currentFrame.layers.length) {
            this.currentLayerIndex = this.currentFrame.layers.length - 1;
        }
        this.bus.emit(Events.FRAME_CHANGED, index);
        this.bus.emit(Events.CANVAS_REDRAW);
    }

    setCurrentLayer(index) {
        if (index < 0 || index >= this.currentFrame.layers.length) return;
        this.currentLayerIndex = index;
        this.bus.emit(Events.LAYER_CHANGED, index);
    }

    setZoom(zoom) {
        this.zoom = Math.max(1, Math.min(64, zoom));
        this.bus.emit(Events.ZOOM_CHANGED, this.zoom);
        this.bus.emit(Events.CANVAS_REDRAW);
    }

    setPreviewScale(scale) {
        this.previewScale = scale === 'fit' ? 'fit' : parseFloat(scale);
        this.bus.emit(Events.CANVAS_REDRAW);
    }

    togglePreviewMode() {
        this.layoutPreviewMode = !this.layoutPreviewMode;
        this.bus.emit(Events.CANVAS_REDRAW); // Ensure everything updates
    }

    /**
     * Zoom focused on a specific screen point.
     * @param {number} deltaZoom - The change in zoom level.
     * @param {number} anchorX - Optional screen X to anchor zoom (if null, centers).
     * @param {number} anchorY - Optional screen Y to anchor zoom (if null, centers).
     * @param {number} vW - Viewport width.
     * @param {number} vH - Viewport height.
     */
    zoomAt(deltaZoom, anchorX, anchorY, vW, vH) {
        const oldZoom = this.zoom;
        const newZoom = Math.max(1, Math.min(64, oldZoom + deltaZoom));
        if (oldZoom === newZoom) return;

        // If no anchor provided, use viewport center
        if (anchorX === undefined || anchorX === null) anchorX = vW / 2;
        if (anchorY === undefined || anchorY === null) anchorY = vH / 2;

        // Calculate world coordinate under the anchor before zoom
        const worldX = (anchorX - this.panX) / oldZoom;
        const worldY = (anchorY - this.panY) / oldZoom;

        // Set new zoom
        this.zoom = newZoom;

        // Calculate new pan to keep the world coordinate at the same anchor point
        let nextPanX = anchorX - worldX * newZoom;
        let nextPanY = anchorY - worldY * newZoom;

        // --- Auto-centering / Clamping for Zoom-Out ---
        const artW = this.canvasWidth * newZoom;
        const artH = this.canvasHeight * newZoom;

        // If art fits in viewport horizontally, center it
        if (artW <= vW) {
            nextPanX = (vW - artW) / 2;
        } else {
            // Keep art within viewport edges (no dead space)
            nextPanX = Math.min(0, Math.max(vW - artW, nextPanX));
        }

        // If art fits in viewport vertically, center it
        if (artH <= vH) {
            nextPanY = (vH - artH) / 2;
        } else {
            // Keep art within viewport edges
            nextPanY = Math.min(0, Math.max(vH - artH, nextPanY));
        }

        this.panX = nextPanX;
        this.panY = nextPanY;

        this.bus.emit(Events.ZOOM_CHANGED, this.zoom);
        this.bus.emit(Events.CANVAS_REDRAW);
    }

    // --- Project management ---

    newProject(width, height) {
        this.canvasWidth = Math.min(width, this.maxCanvasSize);
        this.canvasHeight = Math.min(height, this.maxCanvasSize);
        this.frames = [createFrame(this.canvasWidth, this.canvasHeight)];
        this.currentFrameIndex = 0;
        this.currentLayerIndex = 0;
        this.zoom = Math.max(1, Math.floor(512 / Math.max(this.canvasWidth, this.canvasHeight)));
        this.panX = 0;
        this.panY = 0;
        this.bus.emit(Events.PROJECT_LOADED);
        this.bus.emit(Events.CANVAS_REDRAW);
    }

    // --- Default palette ---

    _defaultPalette() {
        return [
            '#000000', '#1d2b53', '#7e2553', '#008751',
            '#ab5236', '#5f574f', '#c2c3c7', '#fff1e8',
            '#ff004d', '#ffa300', '#ffec27', '#00e436',
            '#29adff', '#83769c', '#ff77a8', '#ffccaa',
            '#291814', '#111d35', '#422136', '#125359',
            '#742f29', '#49333b', '#a28879', '#f3ef7d',
            '#be1250', '#ff6c24', '#a8e72e', '#00b543',
            '#065ab5', '#754665', '#ff6e59', '#ff9b63',
        ];
    }

    _hexToRgba(hex) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return { r, g, b, a: 255 };
    }

    _rgbaToHex(r, g, b) {
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
}
