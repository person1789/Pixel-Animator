/**
 * Project Save/Load — serializes project state to a .pixanim JSON file.
 */
import { createFrame, createLayer } from '../state.js';
import { Events } from '../events.js';

export class ProjectIO {
    constructor(state, bus) {
        this.state = state;
        this.bus = bus;
    }

    saveToLocalStorage() {
        const project = this._getProjectData();
        const json = JSON.stringify(project);
        localStorage.setItem('pixelAnimatorAutoSave', json);
    }

    loadFromLocalStorage() {
        const json = localStorage.getItem('pixelAnimatorAutoSave');
        if (!json) return false;
        try {
            const project = JSON.parse(json);
            this._applyProject(project);
            return true;
        } catch (err) {
            console.error('Failed to load auto-save:', err);
            return false;
        }
    }

    save() {
        const project = this._getProjectData();
        const json = JSON.stringify(project);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `project-${Date.now()}.pixanim`; // Added timestamp
        a.click();
        
        URL.revokeObjectURL(url);
    }

    load() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pxl,.pixanim,.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const project = JSON.parse(ev.target.result);
                    this._applyProject(project);
                } catch (err) {
                    console.error('Failed to load project:', err);
                    alert('Invalid project file.');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    _getProjectData() {
        return {
            version: 1,
            canvasWidth: this.state.canvasWidth,
            canvasHeight: this.state.canvasHeight,
            fps: this.state.fps,
            palette: [...this.state.palette],
            tags: [...this.state.tags || []],
            frames: this.state.frames.map(frame => ({
                duration: frame.duration || 100,
                layers: frame.layers.map(layer => ({
                    name: layer.name,
                    visible: layer.visible,
                    locked: layer.locked,
                    opacity: layer.opacity,
                    type: layer.type || 'normal',
                    data: this._encodeData(layer.data),
                })),
            })),
        };
    }

    _applyProject(project) {
        // 1. Basic properties
        this.state.canvasWidth = project.canvasWidth;
        this.state.canvasHeight = project.canvasHeight;
        this.state.fps = project.fps || 12;
        this.state.palette = project.palette ? [...project.palette] : this.state.palette;
        this.state.tags = project.tags || [];

        // 2. Reconstruct Frames & Layers
        // We use the same length calculation used in _decodeData
        const expectedDataLength = project.canvasWidth * project.canvasHeight * 4;

        this.state.frames = project.frames.map(frameData => {
            return {
                duration: frameData.duration || 100,
                layers: frameData.layers.map(layerData => ({
                    ...layerData,
                    visible: layerData.visible !== false,
                    locked: !!layerData.locked,
                    opacity: layerData.opacity ?? 1,
                    data: this._decodeData(layerData.data, expectedDataLength)
                }))
            };
        });

        // 3. Reset UI Selection state
        this.state.currentFrameIndex = 0;
        this.state.currentLayerIndex = 0;
        
        // 4. Update Viewport
        this.state.zoom = Math.max(1, Math.floor(512 / Math.max(this.state.canvasWidth, this.state.canvasHeight)));

        const dimDisplay = document.getElementById('status-dimensions');
        if (dimDisplay) {
            dimDisplay.textContent = `${this.state.canvasWidth}×${this.state.canvasHeight}`;
        }

        // 5. Notify the rest of the app
        this.bus.emit(Events.PROJECT_LOADED);
        this.bus.emit(Events.CANVAS_REDRAW);
    }

    /**
     * Efficiently Encode Uint8ClampedArray to base64.
     * Uses a loop to avoid "Maximum call stack size" errors on large images.
     */
    _encodeData(data) {
        let binary = "";
        const len = data.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(data[i]);
        }
        return btoa(binary);
    }

    /**
     * Decode base64 to Uint8ClampedArray.
     */
    _decodeData(base64, expectedLength) {
        try {
            const binary = atob(base64);
            const data = new Uint8ClampedArray(expectedLength);
            for (let i = 0; i < binary.length && i < expectedLength; i++) {
                data[i] = binary.charCodeAt(i);
            }
            return data;
        } catch (err) {
            console.error('Decoding error:', err);
            return new Uint8ClampedArray(expectedLength);
        }
    }
}
