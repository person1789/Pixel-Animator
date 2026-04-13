/**
 * Layer Manager — handles layer CRUD, reordering, visibility, and UI rendering.
 */
import { Events } from '../events.js';
import { createLayer, cloneLayer } from '../state.js';

export class LayerManager {
    constructor(state, bus) {
        this.state = state;
        this.bus = bus;

        this.bus.on(Events.LAYER_CHANGED, () => this.renderUI());
        this.bus.on(Events.FRAME_CHANGED, () => this.renderUI());
        this.bus.on(Events.PROJECT_LOADED, () => this.renderUI());
    }

    addLayer(name) {
        const layers = this.state.currentFrame.layers;
        const newName = name || `Layer ${layers.length + 1}`;
        const layer = createLayer(newName, this.state.canvasWidth, this.state.canvasHeight);
        layers.push(layer);
        this.state.setCurrentLayer(layers.length - 1);
        this.bus.emit(Events.CANVAS_REDRAW);
        this.renderUI();
    }

    deleteLayer() {
        const layers = this.state.currentFrame.layers;
        if (layers.length <= 1) return; // Must keep at least one
        layers.splice(this.state.currentLayerIndex, 1);
        if (this.state.currentLayerIndex >= layers.length) {
            this.state.currentLayerIndex = layers.length - 1;
        }
        this.bus.emit(Events.LAYER_CHANGED, this.state.currentLayerIndex);
        this.bus.emit(Events.CANVAS_REDRAW);
        this.renderUI();
    }

    duplicateLayer() {
        const layers = this.state.currentFrame.layers;
        const copy = cloneLayer(this.state.currentLayer);
        copy.name = copy.name + ' copy';
        layers.splice(this.state.currentLayerIndex + 1, 0, copy);
        this.state.setCurrentLayer(this.state.currentLayerIndex + 1);
        this.bus.emit(Events.CANVAS_REDRAW);
        this.renderUI();
    }

    mergeDown() {
        const layers = this.state.currentFrame.layers;
        const idx = this.state.currentLayerIndex;
        if (idx <= 0) return; // Can't merge bottom

        const upper = layers[idx];
        const lower = layers[idx - 1];
        const { canvasWidth, canvasHeight } = this.state;

        // Merge upper onto lower
        for (let i = 0; i < canvasWidth * canvasHeight * 4; i += 4) {
            const ua = upper.data[i + 3] / 255 * upper.opacity;
            if (ua > 0) {
                const la = lower.data[i + 3] / 255;
                const outA = ua + la * (1 - ua);
                if (outA > 0) {
                    lower.data[i] = Math.round((upper.data[i] * ua + lower.data[i] * la * (1 - ua)) / outA);
                    lower.data[i + 1] = Math.round((upper.data[i + 1] * ua + lower.data[i + 1] * la * (1 - ua)) / outA);
                    lower.data[i + 2] = Math.round((upper.data[i + 2] * ua + lower.data[i + 2] * la * (1 - ua)) / outA);
                    lower.data[i + 3] = Math.round(outA * 255);
                }
            }
        }

        layers.splice(idx, 1);
        this.state.setCurrentLayer(idx - 1);
        this.bus.emit(Events.CANVAS_REDRAW);
        this.renderUI();
    }

    toggleVisibility(index) {
        const layer = this.state.currentFrame.layers[index];
        if (layer) {
            layer.visible = !layer.visible;
            this.bus.emit(Events.CANVAS_REDRAW);
            this.renderUI();
        }
    }

    toggleLock(index) {
        const layer = this.state.currentFrame.layers[index];
        if (layer) {
            layer.locked = !layer.locked;
            this.renderUI();
        }
    }

    setOpacity(index, opacity) {
        const layer = this.state.currentFrame.layers[index];
        if (layer) {
            layer.opacity = Math.max(0, Math.min(1, opacity));
            this.bus.emit(Events.CANVAS_REDRAW);
        }
    }

    moveLayer(fromIndex, toIndex) {
        const layers = this.state.currentFrame.layers;
        if (toIndex < 0 || toIndex >= layers.length) return;
        const [layer] = layers.splice(fromIndex, 1);
        layers.splice(toIndex, 0, layer);
        this.state.currentLayerIndex = toIndex;
        this.bus.emit(Events.LAYER_CHANGED, toIndex);
        this.bus.emit(Events.CANVAS_REDRAW);
        this.renderUI();
    }

    clearCurrentLayer() {
        this.state.currentLayer.data.fill(0);
        this.bus.emit(Events.CANVAS_REDRAW);
    }

    /**
     * Render the layers list UI in the sidebar.
     */
    renderUI() {
        const container = document.getElementById('layers-list');
        if (!container) return;
        container.innerHTML = '';

        const layers = this.state.currentFrame.layers;

        // Render top to bottom (last layer in array = top)
        for (let i = layers.length - 1; i >= 0; i--) {
            const layer = layers[i];
            const item = document.createElement('div');
            item.classList.add('layer-item');
            if (i === this.state.currentLayerIndex) item.classList.add('active');

            // Visibility toggle
            const visBtn = document.createElement('span');
            visBtn.classList.add('layer-item__visibility');
            if (layer.visible) visBtn.classList.add('visible');
            visBtn.textContent = layer.visible ? '👁' : '👁‍🗨';
            visBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleVisibility(i);
            });

            // Lock toggle
            const lockBtn = document.createElement('span');
            lockBtn.classList.add('layer-item__lock');
            if (layer.locked) lockBtn.classList.add('locked');
            lockBtn.textContent = layer.locked ? '🔒' : '🔓';
            lockBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleLock(i);
            });

            // Layer preview thumbnail
            const preview = document.createElement('canvas');
            preview.classList.add('layer-item__preview');
            preview.width = 28;
            preview.height = 28;
            this._renderLayerPreview(preview, layer);

            // Name
            const name = document.createElement('span');
            name.classList.add('layer-item__name');
            name.textContent = layer.name;

            // Opacity
            const opacityInput = document.createElement('input');
            opacityInput.classList.add('layer-item__opacity');
            opacityInput.type = 'number';
            opacityInput.min = 0;
            opacityInput.max = 100;
            opacityInput.value = Math.round(layer.opacity * 100);
            opacityInput.addEventListener('change', (e) => {
                e.stopPropagation();
                this.setOpacity(i, parseInt(e.target.value) / 100);
            });
            opacityInput.addEventListener('click', (e) => e.stopPropagation());

            item.appendChild(visBtn);
            item.appendChild(lockBtn);
            item.appendChild(preview);
            item.appendChild(name);
            item.appendChild(opacityInput);

            item.addEventListener('click', () => {
                this.state.setCurrentLayer(i);
                this.renderUI();
            });

            container.appendChild(item);
        }
    }

    _renderLayerPreview(canvas, layer) {
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        const { canvasWidth, canvasHeight } = this.state;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvasWidth;
        tempCanvas.height = canvasHeight;
        const tctx = tempCanvas.getContext('2d');
        const imageData = new ImageData(new Uint8ClampedArray(layer.data), canvasWidth, canvasHeight);
        tctx.putImageData(imageData, 0, 0);
        ctx.clearRect(0, 0, 28, 28);
        ctx.drawImage(tempCanvas, 0, 0, 28, 28);
    }
}
