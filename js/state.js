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
export function createLayer(name, width, height) {
    return {
        name,
        visible: true,
        locked: false,
        opacity: 1.0,
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

        // Tools
        this.activeTool = 'pencil';
        this.toolOptions = {
            brushSize: 1,
            mirrorAxis: 'horizontal', // horizontal | vertical | both
            selectionRect: null,       // { x, y, w, h } or null
            shapeMode: 'outline',      // outline | filled
        };

        // Colors
        this.primaryColor = { r: 255, g: 255, b: 255, a: 255 };
        this.secondaryColor = { r: 0, g: 0, b: 0, a: 0 };

        // Viewport
        this.zoom = 16; // pixels on screen per art pixel
        this.panX = 0;
        this.panY = 0;
        this.showGrid = true;

        // Animation
        this.fps = 12;
        this.isPlaying = false;
        this.loopPlayback = true;

        // Onion skin
        this.onionSkinEnabled = false;
        this.onionSkinFramesBefore = 2;
        this.onionSkinFramesAfter = 1;

        // Palette
        this.palette = this._defaultPalette();
    }

    // --- Convenience getters ---

    get currentFrame() {
        return this.frames[this.currentFrameIndex];
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
        return {
            r: layerData[i],
            g: layerData[i + 1],
            b: layerData[i + 2],
            a: layerData[i + 3],
        };
    }

    setPixel(layerData, x, y, color) {
        if (x < 0 || x >= this.canvasWidth || y < 0 || y >= this.canvasHeight) return;
        const i = (y * this.canvasWidth + x) * 4;
        layerData[i] = color.r;
        layerData[i + 1] = color.g;
        layerData[i + 2] = color.b;
        layerData[i + 3] = color.a;
    }

    // --- State mutation helpers (all emit events) ---

    setActiveTool(toolName) {
        this.activeTool = toolName;
        this.bus.emit(Events.TOOL_CHANGED, toolName);
    }

    setPrimaryColor(color) {
        this.primaryColor = { ...color };
        this.bus.emit(Events.COLOR_CHANGED, { primary: this.primaryColor });
    }

    setSecondaryColor(color) {
        this.secondaryColor = { ...color };
        this.bus.emit(Events.COLOR_CHANGED, { secondary: this.secondaryColor });
    }

    swapColors() {
        const tmp = this.primaryColor;
        this.primaryColor = this.secondaryColor;
        this.secondaryColor = tmp;
        this.bus.emit(Events.COLOR_CHANGED, {
            primary: this.primaryColor,
            secondary: this.secondaryColor,
        });
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
}
