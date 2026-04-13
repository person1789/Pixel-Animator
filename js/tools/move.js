/**
 * Move Tool — moves the content of the current layer or selection.
 */
export class MoveTool {
    constructor(state, bus, historyManager) {
        this.state = state;
        this.bus = bus;
        this.history = historyManager;
        this._startPos = null;
        this._beforeData = null;
        this._offset = { x: 0, y: 0 };
    }

    onMouseDown(pos) {
        this._startPos = pos;
        this._beforeData = new Uint8ClampedArray(this.state.currentLayer.data);
        this._offset = { x: 0, y: 0 };
    }

    onMouseMove(pos) {
        if (!this._startPos) return;

        const dx = pos.x - this._startPos.x - this._offset.x;
        const dy = pos.y - this._startPos.y - this._offset.y;

        if (dx === 0 && dy === 0) return;

        this._shiftLayerData(dx, dy);
        this._offset.x += dx;
        this._offset.y += dy;
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
        this._startPos = null;
        this._beforeData = null;
        this._offset = { x: 0, y: 0 };
    }

    _shiftLayerData(dx, dy) {
        const { canvasWidth, canvasHeight } = this.state;
        const layer = this.state.currentLayer;
        const oldData = new Uint8ClampedArray(layer.data);
        layer.data.fill(0); // Clear

        for (let y = 0; y < canvasHeight; y++) {
            for (let x = 0; x < canvasWidth; x++) {
                const srcX = x - dx;
                const srcY = y - dy;
                if (srcX >= 0 && srcX < canvasWidth && srcY >= 0 && srcY < canvasHeight) {
                    const srcI = (srcY * canvasWidth + srcX) * 4;
                    const dstI = (y * canvasWidth + x) * 4;
                    layer.data[dstI] = oldData[srcI];
                    layer.data[dstI + 1] = oldData[srcI + 1];
                    layer.data[dstI + 2] = oldData[srcI + 2];
                    layer.data[dstI + 3] = oldData[srcI + 3];
                }
            }
        }
    }
}
