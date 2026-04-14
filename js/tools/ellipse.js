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

        const rx = Math.floor((x1 - x0) / 2);
        const ry = Math.floor((y1 - y0) / 2);
        const cx = x0 + rx;
        const cy = y0 + ry;

        const color = this.state.primaryColor;
        const data = this.state.currentLayer.data;
        const filled = this.state.toolOptions.shapeMode === 'filled';

        if (rx <= 0 || ry <= 0) {
            this.state.setPixel(data, cx, cy, color);
            return;
        }

        // Use Midpoint Ellipse Algorithm
        let x = 0;
        let y = ry;

        // Initial decision parameter for region 1
        let d1 = (ry * ry) - (rx * rx * ry) + (0.25 * rx * rx);
        let dx = 2 * ry * ry * x;
        let dy = 2 * rx * rx * y;

        const plot = (px, py) => this.state.setPixel(data, px, py, color);
        
        // Horizontal scanlines for filling
        const horizontalLines = new Map();
        const addLinePixel = (px, py) => {
            if (!horizontalLines.has(py)) horizontalLines.set(py, { min: px, max: px });
            const line = horizontalLines.get(py);
            line.min = Math.min(line.min, px);
            line.max = Math.max(line.max, px);
            plot(px, py);
        };

        const drawSymmetric = (px, py) => {
            if (filled) {
                addLinePixel(cx + px, cy + py);
                addLinePixel(cx - px, cy + py);
                addLinePixel(cx + px, cy - py);
                addLinePixel(cx - px, cy - py);
            } else {
                plot(cx + px, cy + py);
                plot(cx - px, cy + py);
                plot(cx + px, cy - py);
                plot(cx - px, cy - py);
            }
        };

        // Region 1
        while (dx < dy) {
            drawSymmetric(x, y);
            if (d1 < 0) {
                x++;
                dx = dx + (2 * ry * ry);
                d1 = d1 + dx + (ry * ry);
            } else {
                x++;
                y--;
                dx = dx + (2 * ry * ry);
                dy = dy - (2 * rx * rx);
                d1 = d1 + dx - dy + (ry * ry);
            }
        }

        // Decision parameter for region 2
        let d2 = ((ry * ry) * ((x + 0.5) * (x + 0.5))) + ((rx * rx) * ((y - 1) * (y - 1))) - (rx * rx * ry * ry);

        // Region 2
        while (y >= 0) {
            drawSymmetric(x, y);
            if (d2 > 0) {
                y--;
                dy = dy - (2 * rx * rx);
                d2 = d2 + (rx * rx) - dy;
            } else {
                y--;
                x++;
                dx = dx + (2 * ry * ry);
                dy = dy - (2 * rx * rx);
                d2 = d2 + dx - dy + (rx * rx);
            }
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
