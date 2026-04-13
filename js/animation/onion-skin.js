/**
 * Onion Skin — renders previous/next frames as semi-transparent overlays.
 */
import { Events } from '../events.js';

export class OnionSkin {
    constructor(state, bus, renderer) {
        this.state = state;
        this.bus = bus;
        this.renderer = renderer;
    }

    /**
     * Toggle onion skin on/off.
     */
    toggle() {
        this.state.onionSkinEnabled = !this.state.onionSkinEnabled;
        this.bus.emit(Events.ONION_SKIN_CHANGED, this.state.onionSkinEnabled);
        this.bus.emit(Events.CANVAS_REDRAW);
    }

    /**
     * Called by the render pipeline — if enabled, renders onion frames.
     * Returns true if it handled rendering  (caller should skip normal render).
     */
    render() {
        if (!this.state.onionSkinEnabled) return false;
        if (this.state.frames.length <= 1) return false;

        const currentIndex = this.state.currentFrameIndex;
        const beforeFrames = [];
        const afterFrames = [];

        // Previous frames (red tint, decreasing opacity)
        for (let i = 1; i <= this.state.onionSkinFramesBefore; i++) {
            const idx = currentIndex - i;
            if (idx >= 0) {
                beforeFrames.push({
                    frame: this.state.frames[idx],
                    opacity: 0.3 / i,
                });
            }
        }

        // Next frames (blue tint, decreasing opacity)
        for (let i = 1; i <= this.state.onionSkinFramesAfter; i++) {
            const idx = currentIndex + i;
            if (idx < this.state.frames.length) {
                afterFrames.push({
                    frame: this.state.frames[idx],
                    opacity: 0.3 / i,
                });
            }
        }

        this.renderer.renderWithOnionSkin(beforeFrames, afterFrames);
        return true;
    }
}
