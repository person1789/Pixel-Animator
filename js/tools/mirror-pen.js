/**
 * Mirror Pen Tool — symmetry drawing.
 * Supports horizontal, vertical, or both axes.
 */
export class MirrorPenTool {
    constructor(state, bus, historyManager) {
        this.state = state;
        this.bus = bus;
        this.history = historyManager;
        this._lastPos = null;
        this._beforeData = null;
    }

    onMouseDown(pos) {
        this._beforeData = new Uint8ClampedArray(this.state.currentLayer.data);
        this._lastPos = pos;
        this._drawMirrored(pos.x, pos.y);
    }

    onMouseMove(pos) {
        if (this._lastPos) {
            // Interpolate between last and current
            this._bresenhamMirrored(this._lastPos.x, this._lastPos.y, pos.x, pos.y);
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

    _drawMirrored(x, y) {
        const color = this.state.primaryColor;
        const data = this.state.currentLayer.data;
        const { canvasWidth, canvasHeight } = this.state;
        const axis = this.state.toolOptions.mirrorAxis;

        // Original
        this.state.setPixel(data, x, y, color);

        // Horizontal mirror
        if (axis === 'horizontal' || axis === 'both') {
            const mx = canvasWidth - 1 - x;
            this.state.setPixel(data, mx, y, color);
        }

        // Vertical mirror
        if (axis === 'vertical' || axis === 'both') {
            const my = canvasHeight - 1 - y;
            this.state.setPixel(data, x, my, color);
        }

        // Both axes — diagonal mirror
        if (axis === 'both') {
            const mx = canvasWidth - 1 - x;
            const my = canvasHeight - 1 - y;
            this.state.setPixel(data, mx, my, color);
        }
    }

    _bresenhamMirrored(x0, y0, x1, y1) {
        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;

        while (true) {
            this._drawMirrored(x0, y0);
            if (x0 === x1 && y0 === y1) break;
            const e2 = 2 * err;
            if (e2 > -dy) { err -= dy; x0 += sx; }
            if (e2 < dx) { err += dx; y0 += sy; }
        }
    }
}
