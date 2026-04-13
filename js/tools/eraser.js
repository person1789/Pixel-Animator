/**
 * Eraser Tool — sets pixels to transparent (alpha = 0).
 * Uses same Bresenham interpolation as the pencil.
 */
export class EraserTool {
    constructor(state, bus, historyManager) {
        this.state = state;
        this.bus = bus;
        this.history = historyManager;
        this._lastPos = null;
        this._beforeData = null;
        this._transparent = { r: 0, g: 0, b: 0, a: 0 };
    }

    onMouseDown(pos) {
        this._beforeData = new Uint8ClampedArray(this.state.currentLayer.data);
        this._lastPos = pos;
        this._erasePixel(pos.x, pos.y);
    }

    onMouseMove(pos) {
        if (this._lastPos) {
            this._bresenhamLine(this._lastPos.x, this._lastPos.y, pos.x, pos.y);
        }
        this._lastPos = pos;
    }

    onMouseUp() {
        if (this._beforeData && this.history) {
            this.history.pushLayerChange(
                this.state.currentFrameIndex,
                this.state.currentLayerIndex,
                this._beforeData,
                new Uint8ClampedArray(this.state.currentLayer.data)
            );
        }
        this._lastPos = null;
        this._beforeData = null;
    }

    _erasePixel(x, y) {
        this.state.setPixel(this.state.currentLayer.data, x, y, this._transparent);
    }

    _bresenhamLine(x0, y0, x1, y1) {
        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;

        while (true) {
            this._erasePixel(x0, y0);
            if (x0 === x1 && y0 === y1) break;
            const e2 = 2 * err;
            if (e2 > -dy) { err -= dy; x0 += sx; }
            if (e2 < dx) { err += dx; y0 += sy; }
        }
    }
}
