/**
 * Screen-to-pixel and pixel-to-screen coordinate mapping.
 */
export class CoordinateMapper {
    constructor(state, canvasElement) {
        this.state = state;
        this.canvas = canvasElement;
    }

    /**
     * Convert screen (mouse) coordinates to pixel-art grid coordinates.
     * @returns {{ x: number, y: number }} or null if out of bounds
     */
    screenToPixel(screenX, screenY) {
        const rect = this.canvas.getBoundingClientRect();
        const canvasScreenX = screenX - rect.left;
        const canvasScreenY = screenY - rect.top;

        const x = Math.floor((canvasScreenX - this.state.panX) / this.state.zoom);
        const y = Math.floor((canvasScreenY - this.state.panY) / this.state.zoom);

        if (x < 0 || x >= this.state.canvasWidth || y < 0 || y >= this.state.canvasHeight) {
            return null;
        }
        return { x, y };
    }

    /**
     * Convert pixel-art grid coordinates to screen coordinates (top-left of the pixel cell).
     */
    pixelToScreen(px, py) {
        return {
            x: px * this.state.zoom + this.state.panX,
            y: py * this.state.zoom + this.state.panY,
        };
    }

    /**
     * Get the canvas-area offset for centering the art on the viewport.
     */
    getCenterOffset(viewportWidth, viewportHeight) {
        const artW = this.state.canvasWidth * this.state.zoom;
        const artH = this.state.canvasHeight * this.state.zoom;
        return {
            x: Math.floor((viewportWidth - artW) / 2),
            y: Math.floor((viewportHeight - artH) / 2),
        };
    }
}
