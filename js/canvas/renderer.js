/**
 * Main rendering pipeline — composites layers onto the display canvas.
 * Uses off-screen canvases for layer compositing.
 */
import { Events } from '../events.js';
import { GridRenderer } from './grid.js';

export class Renderer {
    constructor(state, bus, canvasElement) {
        this.state = state;
        this.bus = bus;
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');
        this.gridRenderer = new GridRenderer(state);

        // Off-screen canvas for compositing layers
        this._compositeCanvas = document.createElement('canvas');
        this._compositeCtx = this._compositeCanvas.getContext('2d');

        // Off-screen canvas for a single layer
        this._layerCanvas = document.createElement('canvas');
        this._layerCtx = this._layerCanvas.getContext('2d');

        // Listen for redraw events
        this.bus.on(Events.CANVAS_REDRAW, () => this.render());

        // Checkerboard pattern (for transparency)
        this._checkerPattern = null;
        this._createCheckerPattern();
    }

    /**
     * Resize the display canvas to fill its container.
     */
    resize() {
        const container = this.canvas.parentElement;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;

        // Disable image smoothing for crisp pixels
        this.ctx.imageSmoothingEnabled = false;

        this.render();
    }

    /**
     * Center the artwork in the viewport.
     */
    centerView() {
        const artW = this.state.canvasWidth * this.state.zoom;
        const artH = this.state.canvasHeight * this.state.zoom;
        this.state.panX = Math.floor((this.canvas.width - artW) / 2);
        this.state.panY = Math.floor((this.canvas.height - artH) / 2);
    }

    /**
     * Full render pass.
     */
    render() {
        const { ctx, canvas } = this;
        const { canvasWidth, canvasHeight, zoom, panX, panY } = this.state;

        // Clear display canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw art background (checkerboard for transparency)
        this._drawCheckerboard(ctx, panX, panY, canvasWidth * zoom, canvasHeight * zoom);

        // Composite all visible layers of the current frame
        const composited = this._compositeLayers(this.state.currentFrame);

        // Draw composited image scaled up
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(composited, panX, panY, canvasWidth * zoom, canvasHeight * zoom);

        // Draw grid overlay
        this.gridRenderer.draw(ctx);

        // Draw selection if active
        this._drawSelection(ctx);
    }

    /**
     * Render with onion skin frames (called by the onion skin module).
     */
    renderWithOnionSkin(beforeFrames, afterFrames) {
        const { ctx, canvas } = this;
        const { canvasWidth, canvasHeight, zoom, panX, panY } = this.state;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        this._drawCheckerboard(ctx, panX, panY, canvasWidth * zoom, canvasHeight * zoom);

        ctx.imageSmoothingEnabled = false;

        // Draw "before" frames (red tint)
        for (const { frame, opacity } of beforeFrames) {
            const img = this._compositeLayers(frame);
            ctx.save();
            ctx.globalAlpha = opacity;
            ctx.filter = 'sepia(1) saturate(5) hue-rotate(-30deg)';
            ctx.drawImage(img, panX, panY, canvasWidth * zoom, canvasHeight * zoom);
            ctx.restore();
        }

        // Draw "after" frames (blue tint)
        for (const { frame, opacity } of afterFrames) {
            const img = this._compositeLayers(frame);
            ctx.save();
            ctx.globalAlpha = opacity;
            ctx.filter = 'sepia(1) saturate(5) hue-rotate(180deg)';
            ctx.drawImage(img, panX, panY, canvasWidth * zoom, canvasHeight * zoom);
            ctx.restore();
        }

        // Draw current frame
        const composited = this._compositeLayers(this.state.currentFrame);
        ctx.drawImage(composited, panX, panY, canvasWidth * zoom, canvasHeight * zoom);

        this.gridRenderer.draw(ctx);
        this._drawSelection(ctx);
    }

    /**
     * Render a frame to a standalone canvas (for thumbnails, preview, export).
     */
    renderFrameToCanvas(frame, targetCanvas, excludeReference = false) {
        const { canvasWidth, canvasHeight } = this.state;
        targetCanvas.width = canvasWidth;
        targetCanvas.height = canvasHeight;
        const tctx = targetCanvas.getContext('2d');
        tctx.imageSmoothingEnabled = false;

        const composited = this._compositeLayers(frame, excludeReference);
        tctx.drawImage(composited, 0, 0);
        return targetCanvas;
    }

    // --- Private ---

    _compositeLayers(frame, excludeReference = false) {
        const { canvasWidth, canvasHeight } = this.state;
        this._compositeCanvas.width = canvasWidth;
        this._compositeCanvas.height = canvasHeight;
        const cctx = this._compositeCtx;
        cctx.clearRect(0, 0, canvasWidth, canvasHeight);

        this._layerCanvas.width = canvasWidth;
        this._layerCanvas.height = canvasHeight;
        const lctx = this._layerCtx;

        // Draw layers bottom to top
        for (let i = 0; i < frame.layers.length; i++) {
            const layer = frame.layers[i];
            if (!layer.visible) continue;
            if (excludeReference && layer.type === 'reference') continue;

            // Write layer pixel data to the layer canvas
            let pixelData = layer.data;
            if (this.state.indexedMode) {
                pixelData = new Uint8ClampedArray(canvasWidth * canvasHeight * 4);
                for (let p = 0; p < canvasWidth * canvasHeight; p++) {
                    const index = layer.data[p * 4];
                    let color = { r: 0, g: 0, b: 0, a: 0 };
                    if (index < this.state.palette.length) {
                        color = this.state._hexToRgba(this.state.palette[index]);
                        color.a = layer.data[p * 4 + 3]; // use alpha from layer
                    }
                    pixelData[p * 4] = color.r;
                    pixelData[p * 4 + 1] = color.g;
                    pixelData[p * 4 + 2] = color.b;
                    pixelData[p * 4 + 3] = color.a;
                }
            }
            const imageData = new ImageData(pixelData, canvasWidth, canvasHeight);
            lctx.clearRect(0, 0, canvasWidth, canvasHeight);
            lctx.putImageData(imageData, 0, 0);

            // Composite onto main with layer opacity
            cctx.save();
            cctx.globalAlpha = layer.opacity;
            cctx.drawImage(this._layerCanvas, 0, 0);
            cctx.restore();
        }

        return this._compositeCanvas;
    }

    _createCheckerPattern() {
        const size = 8;
        const patternCanvas = document.createElement('canvas');
        patternCanvas.width = size * 2;
        patternCanvas.height = size * 2;
        const pctx = patternCanvas.getContext('2d');
        pctx.fillStyle = '#2a2a3e';
        pctx.fillRect(0, 0, size * 2, size * 2);
        pctx.fillStyle = '#232338';
        pctx.fillRect(0, 0, size, size);
        pctx.fillRect(size, size, size, size);
        this._checkerPattern = this.ctx.createPattern(patternCanvas, 'repeat');
    }

    _drawCheckerboard(ctx, x, y, w, h) {
        ctx.save();
        ctx.fillStyle = this._checkerPattern || '#1a1a2e';
        ctx.fillRect(x, y, w, h);
        ctx.restore();
    }

    _drawSelection(ctx) {
        const sel = this.state.toolOptions.selectionRect;
        if (!sel) return;

        const { zoom, panX, panY } = this.state;
        const sx = sel.x * zoom + panX;
        const sy = sel.y * zoom + panY;
        const sw = sel.w * zoom;
        const sh = sel.h * zoom;

        ctx.save();
        ctx.strokeStyle = '#58a6ff';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.lineDashOffset = -(Date.now() / 80 % 10);
        ctx.strokeRect(sx, sy, sw, sh);
        ctx.restore();
    }
}
