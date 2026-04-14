/**
 * Export PNG — export the current frame as a PNG image.
 */
export class PNGExporter {
    constructor(state, renderer) {
        this.state = state;
        this.renderer = renderer;
    }

    /**
     * Export current frame as PNG.
     * @param {number} scale - Export scale multiplier (1, 2, 4, 8)
     */
    export(scale = 1) {
        const { canvasWidth, canvasHeight } = this.state;
        const frame = this.state.currentFrame;

        // Render frame at 1x
        const srcCanvas = document.createElement('canvas');
        srcCanvas.width = canvasWidth;
        srcCanvas.height = canvasHeight;
        this.renderer.renderFrameToCanvas(frame, srcCanvas, true);

        // Scale up
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = canvasWidth * scale;
        exportCanvas.height = canvasHeight * scale;
        const ctx = exportCanvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(srcCanvas, 0, 0, exportCanvas.width, exportCanvas.height);

        // Download
        exportCanvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `pixel-animator-frame-${this.state.currentFrameIndex + 1}-${scale}x.png`;
            a.click();
            URL.revokeObjectURL(url);
        }, 'image/png');
    }
}
