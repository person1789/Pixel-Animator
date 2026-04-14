/**
 * Sprite Sheet Exporter — exports all frames as a single PNG sprite sheet
 * with optional JSON metadata.
 */
export class SpriteSheetExporter {
    constructor(state, renderer) {
        this.state = state;
        this.renderer = renderer;
    }

    /**
     * Export as sprite sheet.
     * @param {object} options
     * @param {number} options.scale - Scale multiplier
     * @param {number} options.columns - Columns in the grid (0 = horizontal strip)
     * @param {number} options.padding - Padding between frames
     * @param {boolean} options.includeJson - Export JSON metadata
     */
    export(options = {}) {
        const {
            scale = 1,
            columns = 0,
            padding = 0,
            includeJson = true,
        } = options;

        const { canvasWidth, canvasHeight, frames, fps } = this.state;
        const fw = canvasWidth * scale;
        const fh = canvasHeight * scale;
        const cols = columns > 0 ? columns : frames.length;
        const rows = Math.ceil(frames.length / cols);

        const sheetW = cols * (fw + padding) - padding;
        const sheetH = rows * (fh + padding) - padding;

        const sheetCanvas = document.createElement('canvas');
        sheetCanvas.width = sheetW;
        sheetCanvas.height = sheetH;
        const ctx = sheetCanvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvasWidth;
        tempCanvas.height = canvasHeight;

        const frameData = [];

        frames.forEach((frame, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = col * (fw + padding);
            const y = row * (fh + padding);

            this.renderer.renderFrameToCanvas(frame, tempCanvas, true);
            ctx.drawImage(tempCanvas, x, y, fw, fh);

            frameData.push({
                frame: i,
                x, y,
                width: fw,
                height: fh,
                duration: frame.duration || Math.round(1000 / fps),
            });
        });

        // Download PNG
        sheetCanvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'pixel-animator-spritesheet.png';
            a.click();
            URL.revokeObjectURL(url);
        }, 'image/png');

        // Download JSON metadata
        if (includeJson) {
            const meta = {
                image: 'pixel-animator-spritesheet.png',
                frameWidth: fw,
                frameHeight: fh,
                frameCount: frames.length,
                fps,
                columns: cols,
                rows,
                padding,
                frames: frameData,
            };
            const jsonBlob = new Blob([JSON.stringify(meta, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(jsonBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'pixel-animator-spritesheet.json';
            a.click();
            URL.revokeObjectURL(url);
        }
    }

    /**
     * Export tiles — automatically slice into 16x16 or 32x32 tiles.
     * @param {object} options
     * @param {number} options.tileSize - 16 or 32
     */
    exportTiles(options = {}) {
        const { tileSize = 16 } = options;
        const { canvasWidth, canvasHeight, frames } = this.state;

        if (canvasWidth % tileSize !== 0 || canvasHeight % tileSize !== 0) {
            alert(`Canvas must be divisible by ${tileSize} for tile export.`);
            return;
        }

        const tilesX = canvasWidth / tileSize;
        const tilesY = canvasHeight / tileSize;

        frames.forEach((frame, frameIndex) => {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvasWidth;
            tempCanvas.height = canvasHeight;
            this.renderer.renderFrameToCanvas(frame, tempCanvas, true);

            for (let ty = 0; ty < tilesY; ty++) {
                for (let tx = 0; tx < tilesX; tx++) {
                    const tileCanvas = document.createElement('canvas');
                    tileCanvas.width = tileSize;
                    tileCanvas.height = tileSize;
                    const tctx = tileCanvas.getContext('2d');
                    tctx.drawImage(
                        tempCanvas,
                        tx * tileSize, ty * tileSize, tileSize, tileSize,
                        0, 0, tileSize, tileSize
                    );

                    tileCanvas.toBlob((blob) => {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `tile_f${frameIndex}_x${tx}_y${ty}.png`;
                        a.click();
                        URL.revokeObjectURL(url);
                    }, 'image/png');
                }
            }
        });
    }
}