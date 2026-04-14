/**
 * Dither Tool — applies dither patterns to selections or brush strokes.
 */
export class DitherTool {
    constructor(state, bus, historyManager) {
        this.state = state;
        this.bus = bus;
        this.history = historyManager;
        this.patterns = {
            bayer: [
                [0, 8, 2, 10],
                [12, 4, 14, 6],
                [3, 11, 1, 9],
                [15, 7, 13, 5]
            ],
            ordered: [
                [0, 8, 2, 10],
                [12, 4, 14, 6],
                [3, 11, 1, 9],
                [15, 7, 13, 5]
            ]
        };
        this.currentPattern = 'bayer';
    }

    onMouseDown(pos) {
        // For now, apply dither to a small area
        this._applyDither(pos.x, pos.y, 4, 4);
    }

    onMouseMove(pos) {
        // Optional: drag to apply
    }

    onMouseUp() {
        // Commit to history
    }

    _applyDither(x, y, w, h) {
        const pattern = this.patterns[this.currentPattern];
        const size = pattern.length;
        for (let dy = 0; dy < h; dy++) {
            for (let dx = 0; dx < w; dx++) {
                const px = x + dx;
                const py = y + dy;
                const threshold = pattern[dy % size][dx % size] / 16;
                const color = this.state.getPixel(this.state.currentLayer.data, px, py);
                const gray = (color.r + color.g + color.b) / 3 / 255;
                const newColor = gray > threshold ? this.state.primaryColor : { r: 0, g: 0, b: 0, a: 255 };
                this.state.setPixel(this.state.currentLayer.data, px, py, newColor);
            }
        }
    }
}