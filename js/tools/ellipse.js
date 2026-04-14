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

        const color = this.state.primaryColor;
        const data = this.state.currentLayer.data;
        const filled = this.state.toolOptions.shapeMode === 'filled';
        const plot = (px, py) => this.state.setPixel(data, px, py, color);

        // --- Bounding Box Integer Ellipse Algorithm ---
        // Handles even/odd widths and ensures continuity without gaps
        let a = Math.abs(x1 - x0);
        let b = Math.abs(y1 - y0);
        let b1 = b & 1;
        let dx = 4 * (1 - a) * b * b;
        let dy = 4 * (b1 + 1) * a * a;
        let err = dx + dy + b1 * a * a;
        let e2;

        if (x0 > x1) { x0 = x1; x1 += a; }
        if (y0 > y1) { y0 = y1; }
        y0 += Math.floor((b + 1) / 2);
        y1 = y0 - b1;
        a *= 8 * a;
        b1 = 8 * b * b;

        // Scanline tracker for filling
        const horizontalLines = new Map();
        const addLinePixel = (px, py) => {
            if (!horizontalLines.has(py)) horizontalLines.set(py, { min: px, max: px });
            const line = horizontalLines.get(py);
            line.min = Math.min(line.min, px);
            line.max = Math.max(line.max, px);
            if (!filled) plot(px, py);
        };

        do {
            addLinePixel(x1, y0);
            addLinePixel(x0, y0);
            addLinePixel(x0, y1);
            addLinePixel(x1, y1);

            e2 = 2 * err;
            if (e2 <= dy) {
                y0++; y1--;
                err += dy += a;
            }
            if (e2 >= dx || 2 * err > dy) {
                x0++; x1--;
                err += dx += b1;
            }
        } while (x0 <= x1);

        while (y0 - y1 < b) {
            plot(x0 - 1, y0);
            plot(x1 + 1, y0++);
            plot(x0 - 1, y1);
            plot(x1 + 1, y1--);
        }

        if (filled) {
            horizontalLines.forEach((range, rowY) => {
                for (let colX = range.min; colX <= range.max; colX++) {
                    plot(colX, rowY);
                }
            });
        }
    }
}
