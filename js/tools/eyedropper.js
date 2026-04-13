/**
 * Eyedropper Tool — sample a color from the canvas.
 */
import { Events } from '../events.js';

export class EyedropperTool {
    constructor(state, bus) {
        this.state = state;
        this.bus = bus;
    }

    onMouseDown(pos) {
        this._pickColor(pos);
    }

    onMouseMove(pos) {
        this._pickColor(pos);
    }

    onMouseUp() {}

    _pickColor(pos) {
        // Sample from current layer
        const pixel = this.state.getPixel(this.state.currentLayer.data, pos.x, pos.y);
        if (pixel && pixel.a > 0) {
            this.state.setPrimaryColor(pixel);
        }
    }
}
