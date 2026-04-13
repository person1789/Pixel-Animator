/**
 * Selection Tool — rectangular marching-ants selection.
 * Supports copy/cut/paste via keyboard.
 */
export class SelectionTool {
    constructor(state, bus) {
        this.state = state;
        this.bus = bus;
        this._startPos = null;
    }

    onMouseDown(pos) {
        this._startPos = pos;
        this.state.toolOptions.selectionRect = { x: pos.x, y: pos.y, w: 0, h: 0 };
    }

    onMouseMove(pos) {
        if (!this._startPos) return;
        const x = Math.min(this._startPos.x, pos.x);
        const y = Math.min(this._startPos.y, pos.y);
        const w = Math.abs(pos.x - this._startPos.x) + 1;
        const h = Math.abs(pos.y - this._startPos.y) + 1;
        this.state.toolOptions.selectionRect = { x, y, w, h };
    }

    onMouseUp() {
        this._startPos = null;
        // If selection is zero-size, clear it
        const sel = this.state.toolOptions.selectionRect;
        if (sel && sel.w <= 1 && sel.h <= 1) {
            this.state.toolOptions.selectionRect = null;
        }
    }
}
