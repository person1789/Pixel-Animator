/**
 * Tool Manager — registers tools, switches active tool, dispatches events.
 */
import { Events } from '../events.js';

export class ToolManager {
    constructor(state, bus, renderer, coordMapper) {
        this.state = state;
        this.bus = bus;
        this.renderer = renderer;
        this.coordMapper = coordMapper;
        this.tools = {};
        this.isDrawing = false;
        this._previewData = null; // snapshot for live preview
    }

    register(name, tool) {
        this.tools[name] = tool;
    }

    getActiveTool() {
        return this.tools[this.state.activeTool] || null;
    }

    switchTool(name) {
        if (!this.tools[name]) return;
        this.state.setActiveTool(name);
    }

    /**
     * Called on mousedown on the canvas.
     */
    onMouseDown(e) {
        const pos = this.coordMapper.screenToPixel(e.clientX, e.clientY);
        if (!pos) return;
        if (this.state.currentLayer.locked) return;

        const tool = this.getActiveTool();
        if (!tool) return;

        this.isDrawing = true;

        // Snapshot current layer for preview-based tools
        this._previewData = new Uint8ClampedArray(this.state.currentLayer.data);

        if (tool.onMouseDown) {
            tool.onMouseDown(pos, e);
        }
        this.bus.emit(Events.CANVAS_REDRAW);
    }

    /**
     * Called on mousemove on the canvas.
     */
    onMouseMove(e) {
        const pos = this.coordMapper.screenToPixel(e.clientX, e.clientY);

        // Update status bar coordinates
        if (pos) {
            document.getElementById('status-coords').textContent = `${pos.x}, ${pos.y}`;
        }

        if (!this.isDrawing) return;
        if (!pos) return;

        const tool = this.getActiveTool();
        if (!tool) return;

        if (tool.onMouseMove) {
            tool.onMouseMove(pos, e, this._previewData);
        }
        this.bus.emit(Events.CANVAS_REDRAW);
    }

    /**
     * Called on mouseup on the canvas.
     */
    onMouseUp(e) {
        if (!this.isDrawing) return;
        this.isDrawing = false;

        const pos = this.coordMapper.screenToPixel(e.clientX, e.clientY);
        const tool = this.getActiveTool();

        if (tool && tool.onMouseUp) {
            tool.onMouseUp(pos, e);
        }

        this._previewData = null;
        this.bus.emit(Events.CANVAS_REDRAW);
    }
}
