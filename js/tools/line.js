/**
 * Line Tool — draws straight lines using Bresenham's algorithm.
 * Shows live preview while dragging.
 */
export class LineTool {
    constructor(state, bus, historyManager) {
        this.state = state;
        this.bus = bus;
        this.history = historyManager;
        this._startPos = null;
        this._beforeData = null;
    }

    onMouseDown(pos) {
        this._startPos = pos;
        this._beforeData = new Uint8ClampedArray(this.state.currentLayer.data);
    }

    onMouseMove(pos, e, previewData) {
        if (!this._startPos || !previewData) return;
        // Restore to snapshot, then draw preview line
        this.state.currentLayer.data.set(previewData);
        this._bresenhamLine(this._startPos.x, this._startPos.y, pos.x, pos.y);
    }

    onMouseUp(pos) {
        if (!this._startPos) return;
        // Final line is already drawn from last move
        if (pos) {
            this.state.currentLayer.data.set(this._beforeData);
            this._bresenhamLine(this._startPos.x, this._startPos.y, pos.x, pos.y);
        }

        if (this._beforeData && this.history) {
            this.history.pushLayerChange(
                this.state.currentFrameIndex,
                this.state.currentLayerIndex,
                this._beforeData,
                new Uint8ClampedArray(this.state.currentLayer.data)
            );
        }

        this._startPos = null;
        this._beforeData = null;
    }

    _bresenhamLine(x0, y0, x1, y1) {
        const color = this.state.primaryColor;
        const data = this.state.currentLayer.data;
        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;

        while (true) {
            this.state.setPixel(data, x0, y0, color);
            if (x0 === x1 && y0 === y1) break;
            const e2 = 2 * err;
            if (e2 > -dy) { err -= dy; x0 += sx; }
            if (e2 < dx) { err += dx; y0 += sy; }
        }
    }
}
