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
        
        // CRITICAL: Prevent blurriness for pixel art scaling
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
            
            // Draw scaled frame
            ctx.drawImage(tempCanvas, x, y, fw, fh);

            frameData.push({
                frame: i,
                x, y,
                width: fw,
                height: fh,
                duration: frame.duration || Math.round(1000 / (fps || 12)),
            });
        });

        this._downloadBlob(sheetCanvas, 'pixel-animator-spritesheet.png', 'image/png');

        if (includeJson) {
            const meta = {
                image: 'pixel-animator-spritesheet.png',
                frameWidth: fw,
                frameHeight: fh,
                frameCount: frames.length,
                fps: fps || 12,
                columns: cols,
                rows,
                padding,
                frames: frameData,
            };
            const jsonBlob = new Blob([JSON.stringify(meta, null, 2)], { type: 'application/json' });
            this._triggerDownload(URL.createObjectURL(jsonBlob), 'pixel-animator-spritesheet.json');
        }
    }

    /**
     * Export tiles — Modified to export a single Tile Set image to prevent 
     * browser download blocking and UI freezing.
     */
    exportTiles(options = {}) {
        const { tileSize = 16 } = options;
        const { canvasWidth, canvasHeight, frames } = this.state;

        if (canvasWidth % tileSize !== 0 || canvasHeight % tileSize !== 0) {
            alert(`Canvas (${canvasWidth}x${canvasHeight}) must be divisible by tile size ${tileSize}.`);
            return;
        }

        const tilesX = canvasWidth / tileSize;
        const tilesY = canvasHeight / tileSize;
        const totalTilesPerFrame = tilesX * tilesY;
        
        // Prepare a canvas to hold ALL tiles from ALL frames in a grid
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = tilesX * tileSize;
        exportCanvas.height = (tilesY * frames.length) * tileSize;
        const ctx = exportCanvas.getContext('2d');
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvasWidth;
        tempCanvas.height = canvasHeight;

        frames.forEach((frame, frameIndex) => {
            this.renderer.renderFrameToCanvas(frame, tempCanvas, true);
            
            // Draw this frame's tiles into the master tile sheet
            const offsetY = frameIndex * (tilesY * tileSize);
            ctx.drawImage(tempCanvas, 0, offsetY);
        });

        this._downloadBlob(exportCanvas, 'project-tileset.png', 'image/png');
        console.log(`Exported ${frames.length} frames sliced into ${tileSize}px tiles.`);
    }

    /**
     * Internal helper to handle blob generation and downloading
     */
    _downloadBlob(canvas, filename, type) {
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            this._triggerDownload(url, filename);
            setTimeout(() => URL.revokeObjectURL(url), 100);
        }, type);
    }

    /**
     * Internal helper to trigger the anchor click
     */
    _triggerDownload(url, filename) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a); // Required for some browsers
        a.click();
        document.body.removeChild(a);
    }
}
