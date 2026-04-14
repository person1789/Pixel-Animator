/**
 * Layer Manager — handles layer CRUD, reordering, visibility, and UI rendering.
 */
import { Events } from '../events.js';
import { createLayer, cloneLayer } from '../state.js';

export class LayerManager {
    constructor(state, bus, contextMenu) {
        this.state = state;
        this.bus = bus;
        this.contextMenu = contextMenu;

        this.bus.on(Events.LAYER_CHANGED, () => this.renderUI());
        this.bus.on(Events.FRAME_CHANGED, () => this.renderUI());
        this.bus.on(Events.PROJECT_LOADED, () => this.renderUI());

        this._setupRenameModal();
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

    addReferenceLayer() {
        const layers = this.state.currentFrame.layers;
        const newName = `Reference ${layers.filter(l => l.type === 'reference').length + 1}`;
        const layer = createLayer(newName, this.state.canvasWidth, this.state.canvasHeight, 'reference');
        layers.push(layer);
        this.state.setCurrentLayer(layers.length - 1);
        this.bus.emit(Events.CANVAS_REDRAW);
        this.renderUI();
    }

    loadImageForReferenceLayer(file) {
        const layer = this.state.currentLayer;
        if (layer.type !== 'reference') return;

        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = this.state.canvasWidth;
            canvas.height = this.state.canvasHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, this.state.canvasWidth, this.state.canvasHeight);
            const imageData = ctx.getImageData(0, 0, this.state.canvasWidth, this.state.canvasHeight);
            layer.data.set(imageData.data);
            this.bus.emit(Events.CANVAS_REDRAW);
        };
        img.src = URL.createObjectURL(file);
    }

    deleteLayer() {
        const layers = this.state.currentFrame.layers;
        if (layers.length <= 1) return;
        
        const index = this.state.selectedLayerIndex;
        layers.splice(index, 1);
        
        if (this.state.selectedLayerIndex >= layers.length) {
            this.state.selectedLayerIndex = layers.length - 1;
        }
        if (this.state.currentLayerIndex >= index && this.state.currentLayerIndex > 0) {
            this.state.currentLayerIndex--;
        }

        this.state.setSelectedLayer(this.state.selectedLayerIndex);
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
            item.draggable = true;
            
            if (i === this.state.selectedLayerIndex) item.classList.add('selected');
            if (i === this.state.currentLayerIndex) item.classList.add('active');

            // Drag and Drop
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', i);
                item.classList.add('dragging');
            });

            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                item.classList.add('drop-target');
            });

            item.addEventListener('dragleave', () => {
                item.classList.remove('drop-target');
            });

            item.addEventListener('drop', (e) => {
                e.preventDefault();
                item.classList.remove('drop-target');
                const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                this.state.moveLayer(fromIndex, i);
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
            });

            // Visibility toggle
            const visBtn = document.createElement('span');
            visBtn.classList.add('layer-item__visibility');
            if (layer.visible) visBtn.classList.add('visible');
            visBtn.textContent = layer.visible ? '[v]' : '[ ]';
            visBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleVisibility(i);
            });

            // Lock toggle
            const lockBtn = document.createElement('span');
            lockBtn.classList.add('layer-item__lock');
            if (layer.locked) lockBtn.classList.add('locked');
            lockBtn.textContent = layer.locked ? '[L]' : '[ ]';
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
                this.state.setSelectedLayer(i);
                this.renderUI();
            });

            // Context Menu
            item.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                this.state.setSelectedLayer(i);
                this.renderUI();

                this.contextMenu.show(e.clientX, e.clientY, [
                    { label: 'Rename Layer...', action: () => this.openRenameModal(i) },
                    { label: 'Duplicate Layer', action: () => this.duplicateLayer() },
                    { label: 'Merge Layer Down', action: () => this.mergeDown(), disabled: i === 0 },
                    { type: 'divider' },
                    { label: 'Delete Layer', action: () => this.deleteLayer(), danger: true, disabled: layers.length <= 1 }
                ]);
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

    // ===== Rename Modal Logic =====

    _setupRenameModal() {
        this.renameModal = document.getElementById('rename-layer-dialog');
        this.renameInput = document.getElementById('rename-layer-input');
        
        document.getElementById('rename-layer-save')?.addEventListener('click', () => {
            if (this._renamingIndex !== null) {
                const newName = this.renameInput.value.trim() || `Layer ${this._renamingIndex + 1}`;
                this.state.currentFrame.layers[this._renamingIndex].name = newName;
                this.renderUI();
            }
            this.closeRenameModal();
        });

        document.getElementById('rename-layer-cancel')?.addEventListener('click', () => {
            this.closeRenameModal();
        });

        this.renameInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') document.getElementById('rename-layer-save').click();
            if (e.key === 'Escape') this.closeRenameModal();
        });
    }

    openRenameModal(index) {
        this._renamingIndex = index;
        const layer = this.state.currentFrame.layers[index];
        if (this.renameInput) {
            this.renameInput.value = layer.name;
            this.renameModal.style.display = 'flex';
            this.renameInput.focus();
            this.renameInput.select();
        }
    }

    closeRenameModal() {
        if (this.renameModal) {
            this.renameModal.style.display = 'none';
        }
        this._renamingIndex = null;
    }
}
