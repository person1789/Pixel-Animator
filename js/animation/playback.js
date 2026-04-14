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
        this._playingTag = null;

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
        this._playingTag = null;
    }

    playTag(tagName) {
        const tag = this.state.getTagByName(tagName);
        if (!tag) return;

        this._playingTag = tag;
        this.state.setCurrentFrame(tag.startFrame);
        this.play();
    }

    _tick(timestamp) {
        if (!this.state.isPlaying) return;

        const frameDuration = 1000 / this.state.fps;
        const elapsed = timestamp - this._lastFrameTime;

        if (elapsed >= frameDuration) {
            this._lastFrameTime = timestamp - (elapsed % frameDuration);

            // Advance frame
            let nextFrame = this.state.currentFrameIndex + 1;
            if (this._playingTag) {
                if (nextFrame > this._playingTag.endFrame) {
                    nextFrame = this._playingTag.startFrame;
                }
            } else {
                if (nextFrame >= this.state.frames.length) {
                    if (this.state.loopPlayback) {
                        nextFrame = 0;
                    } else {
                        this.pause();
                        return;
                    }
                }
            }
            this.state.setCurrentPlayingFrame(nextFrame);
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
        
        const container = this._previewCanvas.parentElement;
        if (!container) return;

        const { canvasWidth, canvasHeight, previewScale } = this.state;
        let scale = previewScale;

        if (scale === 'fit') {
            const pad = 20;
            const availableW = container.clientWidth - pad;
            const availableH = container.clientHeight - pad;
            scale = Math.max(1, Math.floor(Math.min(availableW / canvasWidth, availableH / canvasHeight)));
        }

        const targetW = canvasWidth * scale;
        const targetH = canvasHeight * scale;

        // Resize canvas if needed
        if (this._previewCanvas.width !== targetW || this._previewCanvas.height !== targetH) {
            this._previewCanvas.width = targetW;
            this._previewCanvas.height = targetH;
        }

        const ctx = this._previewCanvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, targetW, targetH);

        this.renderer.renderFrameToCanvas(this.state.currentPlayingFrame, this._previewCanvas);
        
        // Manual draw over if scaling was needed (renderFrameToCanvas might reset size)
        // Wait, renderer.renderFrameToCanvas sets targetCanvas size to art resolution.
        // We need to scale it up for preview.
        
        const offscreen = document.createElement('canvas');
        this.renderer.renderFrameToCanvas(this.state.currentPlayingFrame, offscreen);
        
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(offscreen, 0, 0, targetW, targetH);
    }

    /**
     * Update preview without playback (for static editing).
     */
    updatePreview() {
        this._renderPreview();
    }
}
