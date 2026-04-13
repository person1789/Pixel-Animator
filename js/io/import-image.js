/**
 * Import Image — load a PNG/JPEG as a new layer.
 */
import { createLayer } from '../state.js';
import { Events } from '../events.js';

export class ImageImporter {
    constructor(state, bus) {
        this.state = state;
        this.bus = bus;
    }

    /**
     * Open file picker and import an image as a new layer.
     */
    import() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/png,image/jpeg,image/gif,image/webp';
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            this._loadImage(file);
        });
        input.click();
    }

    _loadImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this._importToLayer(img);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    _importToLayer(img) {
        const { canvasWidth, canvasHeight } = this.state;

        // Draw image downsampled to canvas size
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvasWidth;
        tempCanvas.height = canvasHeight;
        const ctx = tempCanvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        // Scale to fit, maintaining aspect ratio
        const scale = Math.min(canvasWidth / img.width, canvasHeight / img.height);
        const w = Math.floor(img.width * scale);
        const h = Math.floor(img.height * scale);
        const x = Math.floor((canvasWidth - w) / 2);
        const y = Math.floor((canvasHeight - h) / 2);

        ctx.drawImage(img, x, y, w, h);
        const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);

        // Create new layer with image data
        const layer = createLayer('Imported', canvasWidth, canvasHeight);
        layer.data.set(imageData.data);

        this.state.currentFrame.layers.push(layer);
        this.state.currentLayerIndex = this.state.currentFrame.layers.length - 1;

        this.bus.emit(Events.LAYER_CHANGED, this.state.currentLayerIndex);
        this.bus.emit(Events.CANVAS_REDRAW);
    }
}
