/**
 * Timeline — frame management and timeline UI rendering.
 */
import { Events } from '../events.js';
import { createFrame, cloneFrame } from '../state.js';

export class Timeline {
    constructor(state, bus, renderer, history, contextMenu) {
        this.state = state;
        this.bus = bus;
        this.renderer = renderer;
        this.history = history;
        this.contextMenu = contextMenu;

        this.bus.on(Events.FRAME_CHANGED, () => this.renderUI());
        this.bus.on(Events.PROJECT_LOADED, () => this.renderUI());
    }

    addFrame() {
        const frame = createFrame(this.state.canvasWidth, this.state.canvasHeight);
        // Copy layer structure from current frame
        const currentFrame = this.state.currentFrame;
        frame.layers = [];
        for (const layer of currentFrame.layers) {
            frame.layers.push({
                name: layer.name,
                visible: layer.visible,
                locked: layer.locked,
                opacity: layer.opacity,
                data: new Uint8ClampedArray(this.state.canvasWidth * this.state.canvasHeight * 4),
            });
        }
        
        const index = this.state.currentFrameIndex + 1;
        this.state.frames.splice(index, 0, frame);
        
        if (this.history) {
            this.history.pushFrameAction('addFrame', index, frame);
        }

        this.state.setCurrentFrame(index);
        this.renderUI();
    }

    deleteFrame() {
        if (this.state.frames.length <= 1) return;
        
        const index = this.state.selectedFrameIndex;
        const frameToDelete = this.state.frames[index];

        if (this.history) {
            this.history.pushFrameAction('deleteFrame', index, frameToDelete);
        }

        this.state.frames.splice(index, 1);
        
        // Adjust indices if needed
        if (this.state.selectedFrameIndex >= this.state.frames.length) {
            this.state.selectedFrameIndex = this.state.frames.length - 1;
        }

        // Adjust current playing frame if it was after the deleted one
        if (this.state.currentFrameIndex >= index && this.state.currentFrameIndex > 0) {
            this.state.currentFrameIndex--;
        }

        this.state.setSelectedFrame(this.state.selectedFrameIndex, false);
        this.renderUI();
    }

    duplicateFrame() {
        const copy = cloneFrame(this.state.currentFrame);
        const index = this.state.currentFrameIndex + 1;
        this.state.frames.splice(index, 0, copy);
        
        if (this.history) {
            this.history.pushFrameAction('addFrame', index, copy);
        }

        this.state.setCurrentFrame(index);
        this.renderUI();
    }

    goToFrame(index) {
        this.state.setCurrentFrame(index);
    }

    goFirst() {
        this.state.setCurrentFrame(0);
    }

    goLast() {
        this.state.setCurrentFrame(this.state.frames.length - 1);
    }

    goPrev() {
        if (this.state.currentFrameIndex > 0) {
            this.state.setCurrentFrame(this.state.currentFrameIndex - 1);
        }
    }

    goNext() {
        if (this.state.currentFrameIndex < this.state.frames.length - 1) {
            this.state.setCurrentFrame(this.state.currentFrameIndex + 1);
        }
    }

    goNext() {
        if (this.state.currentFrameIndex < this.state.frames.length - 1) {
            this.state.setCurrentFrame(this.state.currentFrameIndex + 1);
        }
    }

    /**
     * Render the timeline frame thumbnails.
     */
    renderUI() {
        const container = document.getElementById('timeline-frames');
        if (!container) return;
        container.innerHTML = '';

        this.state.frames.forEach((frame, i) => {
            const thumb = document.createElement('div');
            thumb.classList.add('frame-thumb');
            thumb.draggable = true;
            if (i === this.state.selectedFrameIndex) thumb.classList.add('selected');
            if (i === this.state.currentFrameIndex) thumb.classList.add('active');

            // Drag and Drop
            thumb.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', i);
                thumb.classList.add('dragging');
            });

            thumb.addEventListener('dragover', (e) => {
                e.preventDefault();
                thumb.classList.add('drop-target');
            });

            thumb.addEventListener('dragleave', () => {
                thumb.classList.remove('drop-target');
            });

            thumb.addEventListener('drop', (e) => {
                e.preventDefault();
                thumb.classList.remove('drop-target');
                const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                this.state.moveFrame(fromIndex, i);
            });

            thumb.addEventListener('dragend', () => {
                thumb.classList.remove('dragging');
            });

            const canvas = document.createElement('canvas');
            canvas.classList.add('frame-thumb__canvas');
            canvas.width = 60;
            canvas.height = 60;

            // Render frame thumbnail
            this._renderThumb(canvas, frame);

            const label = document.createElement('span');
            label.classList.add('frame-thumb__label');
            label.textContent = `F${i + 1}`;

            thumb.appendChild(canvas);
            thumb.appendChild(label);

            thumb.addEventListener('click', () => this.goToFrame(i));

            // Context Menu
            thumb.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();

                this.goToFrame(i); // Focus frame first

                this.contextMenu.show(e.clientX, e.clientY, [
                    { label: 'Duplicate Frame', action: () => this.duplicateFrame() },
                    { label: 'Delete Frame', action: () => this.deleteFrame(), danger: true, disabled: this.state.frames.length <= 1 },
                    { type: 'divider' },
                    { label: 'Add New Frame', action: () => this.addFrame() }
                ]);
            });

            container.appendChild(thumb);
        });
    }

    goToFrame(index) {
        this.state.setSelectedFrame(index);
    }

    _renderThumb(canvas, frame) {
        const { canvasWidth, canvasHeight } = this.state;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Create temp composited canvas
        const temp = document.createElement('canvas');
        temp.width = canvasWidth;
        temp.height = canvasHeight;
        this.renderer.renderFrameToCanvas(frame, temp);

        // Scale to fit thumbnail, maintaining aspect ratio
        const scale = Math.min(canvas.width / canvasWidth, canvas.height / canvasHeight);
        const w = canvasWidth * scale;
        const h = canvasHeight * scale;
        const x = (canvas.width - w) / 2;
        const y = (canvas.height - h) / 2;

        ctx.drawImage(temp, x, y, w, h);
    }
}
