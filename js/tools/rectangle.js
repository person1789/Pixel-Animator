/**
 * Rectangle Tool — draws rectangles (outline or filled).
 * Shift key constrains to square.
 */
export class RectangleTool {
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
        this.state.currentLayer.data.set(previewData);
        this._drawRect(this._startPos, pos, e.shiftKey);
    }

    onMouseUp(pos, e) {
        if (!this._startPos) return;
        if (pos) {
            this.state.currentLayer.data.set(this._beforeData);
            this._drawRect(this._startPos, pos, e.shiftKey);
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

    _drawRect(start, end, square) {
        let x0 = Math.min(start.x, end.x);
        let y0 = Math.min(start.y, end.y);
        let x1 = Math.max(start.x, end.x);
        let y1 = Math.max(start.y, end.y);

        if (square) {
            const size = Math.max(x1 - x0, y1 - y0);
            x1 = x0 + size;
            y1 = y0 + size;
        }

        const color = this.state.primaryColor;
        const data = this.state.currentLayer.data;
        const filled = this.state.toolOptions.shapeMode === 'filled';

        for (let y = y0; y <= y1; y++) {
            for (let x = x0; x <= x1; x++) {
                if (filled || x === x0 || x === x1 || y === y0 || y === y1) {
                    this.state.setPixel(data, x, y, color);
                }
            }
        }
    }
}
