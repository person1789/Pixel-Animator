/**
 * Ellipse Tool — draws ellipses using the midpoint ellipse algorithm.
 * Shift constrains to circle.
 */
export class EllipseTool {
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
        this._drawEllipse(this._startPos, pos, e.shiftKey);
    }

    onMouseUp(pos, e) {
        if (!this._startPos) return;
        if (pos) {
            this.state.currentLayer.data.set(this._beforeData);
            this._drawEllipse(this._startPos, pos, e.shiftKey);
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

    _drawEllipse(start, end, circle) {
        let x0 = Math.min(start.x, end.x);
        let y0 = Math.min(start.y, end.y);
        let x1 = Math.max(start.x, end.x);
        let y1 = Math.max(start.y, end.y);

        if (circle) {
            const size = Math.max(x1 - x0, y1 - y0);
            x1 = x0 + size;
            y1 = y0 + size;
        }

        const cx = (x0 + x1) / 2;
        const cy = (y0 + y1) / 2;
        const rx = (x1 - x0) / 2;
        const ry = (y1 - y0) / 2;

        const color = this.state.primaryColor;
        const data = this.state.currentLayer.data;
        const filled = this.state.toolOptions.shapeMode === 'filled';

        if (rx <= 0 && ry <= 0) {
            this.state.setPixel(data, Math.round(cx), Math.round(cy), color);
            return;
        }

        // Use parametric approach for pixel-art quality
        const steps = Math.max(Math.ceil(Math.PI * (rx + ry)), 16);
        const outline = new Set();

        for (let i = 0; i <= steps; i++) {
            const angle = (2 * Math.PI * i) / steps;
            const px = Math.round(cx + rx * Math.cos(angle));
            const py = Math.round(cy + ry * Math.sin(angle));
            outline.add(`${px},${py}`);
            this.state.setPixel(data, px, py, color);
        }

        if (filled) {
            for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
                let minX = Infinity, maxX = -Infinity;
                for (const key of outline) {
                    const [ox, oy] = key.split(',').map(Number);
                    if (oy === y) {
                        minX = Math.min(minX, ox);
                        maxX = Math.max(maxX, ox);
                    }
                }
                if (minX <= maxX) {
                    for (let x = minX; x <= maxX; x++) {
                        this.state.setPixel(data, x, y, color);
                    }
                }
            }
        }
    }
}
