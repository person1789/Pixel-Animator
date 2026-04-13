/**
 * Playback Engine — animation playback with requestAnimationFrame.
 */
import { Events } from '../events.js';

export class PlaybackEngine {
    constructor(state, bus, renderer, timeline) {
        this.state = state;
        this.bus = bus;
        this.renderer = renderer;
        this.timeline = timeline;

        this._animFrameId = null;
        this._lastFrameTime = 0;

        // Preview canvas
        this._previewCanvas = document.getElementById('preview-canvas');
    }

    play() {
        if (this.state.isPlaying) return;
        if (this.state.frames.length <= 1) return;

        this.state.isPlaying = true;
        this._lastFrameTime = performance.now();
        this._animFrameId = requestAnimationFrame((t) => this._tick(t));
        this.bus.emit(Events.PLAYBACK_STATE_CHANGED, true);
    }

    pause() {
        this.state.isPlaying = false;
        if (this._animFrameId) {
            cancelAnimationFrame(this._animFrameId);
            this._animFrameId = null;
        }
        this.bus.emit(Events.PLAYBACK_STATE_CHANGED, false);
    }

    togglePlayPause() {
        if (this.state.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    stop() {
        this.pause();
        this.state.setCurrentFrame(0);
    }

    _tick(timestamp) {
        if (!this.state.isPlaying) return;

        const frameDuration = 1000 / this.state.fps;
        const elapsed = timestamp - this._lastFrameTime;

        if (elapsed >= frameDuration) {
            this._lastFrameTime = timestamp - (elapsed % frameDuration);

            // Advance frame
            let nextFrame = this.state.currentFrameIndex + 1;
            if (nextFrame >= this.state.frames.length) {
                if (this.state.loopPlayback) {
                    nextFrame = 0;
                } else {
                    this.pause();
                    return;
                }
            }
            this.state.setCurrentFrame(nextFrame);
            this.timeline.renderUI();
        }

        // Update preview
        this._renderPreview();

        this._animFrameId = requestAnimationFrame((t) => this._tick(t));
    }

    /**
     * Render the preview canvas (called on each frame change).
     */
    _renderPreview() {
        if (!this._previewCanvas) return;
        this.renderer.renderFrameToCanvas(this.state.currentFrame, this._previewCanvas);
    }

    /**
     * Update preview without playback (for static editing).
     */
    updatePreview() {
        this._renderPreview();
    }
}
