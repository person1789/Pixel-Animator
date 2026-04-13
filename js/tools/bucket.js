/**
 * Bucket Fill Tool — flood fill using BFS.
 */
export class BucketTool {
    constructor(state, bus, historyManager) {
        this.state = state;
        this.bus = bus;
        this.history = historyManager;
    }

    onMouseDown(pos) {
        const layer = this.state.currentLayer;
        const beforeData = new Uint8ClampedArray(layer.data);
        const targetColor = this.state.getPixel(layer.data, pos.x, pos.y);
        const fillColor = this.state.primaryColor;

        // Don't fill if target === fill color
        if (targetColor && this._colorsMatch(targetColor, fillColor)) return;

        this._floodFill(layer.data, pos.x, pos.y, targetColor, fillColor);

        if (this.history) {
            this.history.pushLayerChange(
                this.state.currentFrameIndex,
                this.state.currentLayerIndex,
                beforeData,
                new Uint8ClampedArray(layer.data)
            );
        }
    }

    onMouseMove() {}
    onMouseUp() {}

    _floodFill(data, startX, startY, targetColor, fillColor) {
        if (!targetColor) return;
        const { canvasWidth, canvasHeight } = this.state;
        const queue = [[startX, startY]];
        const visited = new Set();

        while (queue.length > 0) {
            const [x, y] = queue.shift();
            if (x < 0 || x >= canvasWidth || y < 0 || y >= canvasHeight) continue;

            const key = y * canvasWidth + x;
            if (visited.has(key)) continue;
            visited.add(key);

            const pixel = this.state.getPixel(data, x, y);
            if (!this._colorsMatch(pixel, targetColor)) continue;

            this.state.setPixel(data, x, y, fillColor);

            queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
        }
    }

    _colorsMatch(a, b) {
        return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
    }
}
