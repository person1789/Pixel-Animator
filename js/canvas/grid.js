/**
 * Grid overlay renderer — draws pixel grid lines on the canvas.
 */
export class GridRenderer {
    constructor(state) {
        this.state = state;
    }

    /**
     * Draw grid lines on the given context.
     * Only shows when zoom is high enough that pixels are >= 4px.
     */
    draw(ctx) {
        if (!this.state.showGrid) return;
        if (this.state.zoom < 4) return;

        const { canvasWidth, canvasHeight, zoom, panX, panY } = this.state;

        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;

        ctx.beginPath();

        // Vertical lines
        for (let x = 0; x <= canvasWidth; x++) {
            const sx = Math.floor(x * zoom + panX) + 0.5;
            ctx.moveTo(sx, panY);
            ctx.lineTo(sx, canvasHeight * zoom + panY);
        }

        // Horizontal lines
        for (let y = 0; y <= canvasHeight; y++) {
            const sy = Math.floor(y * zoom + panY) + 0.5;
            ctx.moveTo(panX, sy);
            ctx.lineTo(canvasWidth * zoom + panX, sy);
        }

        ctx.stroke();
        ctx.restore();
    }
}
