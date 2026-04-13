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

    /**
     * Save the project to a JSON file.
     */
    save() {
        const project = {
            version: 1,
            canvasWidth: this.state.canvasWidth,
            canvasHeight: this.state.canvasHeight,
            fps: this.state.fps,
            palette: [...this.state.palette],
            frames: this.state.frames.map(frame => ({
                duration: frame.duration,
                layers: frame.layers.map(layer => ({
                    name: layer.name,
                    visible: layer.visible,
                    locked: layer.locked,
                    opacity: layer.opacity,
                    data: this._encodeData(layer.data),
                })),
            })),
        };

        const json = JSON.stringify(project);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'pixel-animator-project.pixanim';
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Load a project from a JSON file.
     */
    load() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pixanim,.json';
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const project = JSON.parse(ev.target.result);
                    this._applyProject(project);
                } catch (err) {
                    console.error('Failed to load project:', err);
                    alert('Failed to load project file.');
                }
            };
            reader.readAsText(file);
        });
        input.click();
    }

    _applyProject(project) {
        this.state.canvasWidth = project.canvasWidth;
        this.state.canvasHeight = project.canvasHeight;
        this.state.fps = project.fps || 12;

        if (project.palette) {
            this.state.palette = [...project.palette];
        }

        this.state.frames = project.frames.map(frameData => ({
            duration: frameData.duration || 100,
            layers: frameData.layers.map(layerData => ({
                name: layerData.name,
                visible: layerData.visible !== false,
                locked: layerData.locked || false,
                opacity: layerData.opacity !== undefined ? layerData.opacity : 1,
                data: this._decodeData(layerData.data, project.canvasWidth * project.canvasHeight * 4),
            })),
        }));

        this.state.currentFrameIndex = 0;
        this.state.currentLayerIndex = 0;
        this.state.zoom = Math.max(1, Math.floor(512 / Math.max(this.state.canvasWidth, this.state.canvasHeight)));

        // Update UI
        document.getElementById('status-dimensions').textContent =
            `${this.state.canvasWidth}×${this.state.canvasHeight}`;

        this.bus.emit(Events.PROJECT_LOADED);
        this.bus.emit(Events.CANVAS_REDRAW);
    }

    /**
     * Encode Uint8ClampedArray to base64.
     */
    _encodeData(data) {
        let binary = '';
        for (let i = 0; i < data.length; i++) {
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
        } catch {
            return new Uint8ClampedArray(expectedLength);
        }
    }
}
