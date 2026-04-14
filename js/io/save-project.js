/**
 * Project Save/Load — serializes project state to a .pixanim JSON file.
 */
import { Events } from '../events.js';

export class ProjectIO {
    constructor(state, bus) {
        this.state = state;
        this.bus = bus;
    }

    saveToLocalStorage() {
        try {
            const project = this._getProjectData();
            const json = JSON.stringify(project);
            localStorage.setItem('pixelAnimatorAutoSave', json);
        } catch (e) {
            console.error('LocalStorage save failed (likely quota exceeded):', e);
        }
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
        a.download = `project-${Date.now()}.pixanim`;
        document.body.appendChild(a); // Crucial for some browsers
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
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
            tags: [...(this.state.tags || [])],
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
        if (!project || !project.frames) throw new Error("Invalid project structure");

        this.state.canvasWidth = project.canvasWidth;
        this.state.canvasHeight = project.canvasHeight;
        this.state.fps = project.fps || 12;
        this.state.palette = project.palette ? [...project.palette] : this.state.palette;
        this.state.tags = project.tags || [];

        const expectedDataLength = this.state.canvasWidth * this.state.canvasHeight * 4;

        this.state.frames = project.frames.map(frameData => ({
            duration: frameData.duration || 100,
            layers: frameData.layers.map(layerData => ({
                ...layerData,
                visible: layerData.visible !== false,
                locked: !!layerData.locked,
                opacity: layerData.opacity ?? 1,
                // Ensure data is always exactly the right size to prevent canvas crashes
                data: this._decodeData(layerData.data, expectedDataLength)
            }))
        }));

        this.state.currentFrameIndex = 0;
        this.state.currentLayerIndex = 0;
        this.state.zoom = Math.max(1, Math.floor(512 / Math.max(this.state.canvasWidth, this.state.canvasHeight)));

        const dimDisplay = document.getElementById('status-dimensions');
        if (dimDisplay) {
            dimDisplay.textContent = `${this.state.canvasWidth}×${this.state.canvasHeight}`;
        }

        this.bus.emit(Events.PROJECT_LOADED);
        this.bus.emit(Events.CANVAS_REDRAW);
    }

    /**
     * More robust encoding for large TypedArrays
     */
    _encodeData(data) {
        // Use Uint8Array view for broader compatibility
        const uint8 = new Uint8Array(data.buffer);
        let binary = "";
        for (let i = 0; i < uint8.length; i++) {
            binary += String.fromCharCode(uint8[i]);
        }
        return btoa(binary);
    }

    _decodeData(base64, expectedLength) {
        try {
            const binary = atob(base64);
            const data = new Uint8ClampedArray(expectedLength);
            // Cap the loop at the minimum of available data or expected length
            const limit = Math.min(binary.length, expectedLength);
            for (let i = 0; i < limit; i++) {
                data[i] = binary.charCodeAt(i);
            }
            return data;
        } catch (err) {
            console.error('Decoding error:', err);
            return new Uint8ClampedArray(expectedLength);
        }
    }
}
