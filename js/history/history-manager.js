/**
 * History Manager — Undo / Redo using the Command pattern.
 * Stores pixel diffs instead of full snapshots for efficiency.
 */
import { Events } from '../events.js';
import { cloneFrame } from '../state.js';

export class HistoryManager {
    constructor(state, bus) {
        this.state = state;
        this.bus = bus;
        this._undoStack = [];
        this._redoStack = [];
        this._maxHistory = 50;
    }

    /**
     * Push a layer pixel data change.
     */
    pushLayerChange(frameIndex, layerIndex, beforeData, afterData) {
        // Only push if data actually changed
        let changed = false;
        for (let i = 0; i < beforeData.length; i++) {
            if (beforeData[i] !== afterData[i]) {
                changed = true;
                break;
            }
        }
        if (!changed) return;

        const command = {
            type: 'layerChange',
            frameIndex,
            layerIndex,
            beforeData: new Uint8ClampedArray(beforeData),
            afterData: new Uint8ClampedArray(afterData),
        };

        this._undoStack.push(command);
        if (this._undoStack.length > this._maxHistory) {
            this._undoStack.shift();
        }
        this._redoStack = []; // Clear redo on new action
        this.bus.emit(Events.HISTORY_CHANGED, this._getStatus());
    }

    /**
     * Push a frame addition or deletion.
     */
    pushFrameAction(type, frameIndex, frameData) {
        const command = {
            type, // 'addFrame' | 'deleteFrame'
            frameIndex,
            frameData: cloneFrame(frameData),
        };

        this._undoStack.push(command);
        if (this._undoStack.length > this._maxHistory) {
            this._undoStack.shift();
        }
        this._redoStack = [];
        this.bus.emit(Events.HISTORY_CHANGED, this._getStatus());
    }

    /**
     * Undo the last action.
     */
    undo() {
        if (this._undoStack.length === 0) return;

        const command = this._undoStack.pop();
        this._apply(command, 'undo');
        this._redoStack.push(command);
        this.bus.emit(Events.HISTORY_CHANGED, this._getStatus());
        this.bus.emit(Events.CANVAS_REDRAW);
    }

    /**
     * Redo the last undone action.
     */
    redo() {
        if (this._redoStack.length === 0) return;

        const command = this._redoStack.pop();
        this._apply(command, 'redo');
        this._undoStack.push(command);
        this.bus.emit(Events.HISTORY_CHANGED, this._getStatus());
        this.bus.emit(Events.CANVAS_REDRAW);
    }

    /**
     * Clear all history.
     */
    clear() {
        this._undoStack = [];
        this._redoStack = [];
        this.bus.emit(Events.HISTORY_CHANGED, this._getStatus());
    }

    _apply(command, direction) {
        if (command.type === 'layerChange') {
            const frame = this.state.frames[command.frameIndex];
            if (!frame) return;
            const layer = frame.layers[command.layerIndex];
            if (!layer) return;

            if (direction === 'undo') {
                layer.data.set(command.beforeData);
            } else {
                layer.data.set(command.afterData);
            }
        } else if (command.type === 'addFrame') {
            // Undo 'addFrame' = delete it. Redo 'addFrame' = add it.
            if (direction === 'undo') {
                this.state.frames.splice(command.frameIndex, 1);
            } else {
                this.state.frames.splice(command.frameIndex, 0, cloneFrame(command.frameData));
            }
            this.state.setCurrentFrame(Math.min(command.frameIndex, this.state.frames.length - 1));
        } else if (command.type === 'deleteFrame') {
            // Undo 'deleteFrame' = add it back. Redo 'deleteFrame' = delete it.
            if (direction === 'undo') {
                this.state.frames.splice(command.frameIndex, 0, cloneFrame(command.frameData));
            } else {
                this.state.frames.splice(command.frameIndex, 1);
            }
            this.state.setCurrentFrame(Math.min(command.frameIndex, this.state.frames.length - 1));
        }
    }

    _getStatus() {
        return {
            canUndo: this._undoStack.length > 0,
            canRedo: this._redoStack.length > 0,
            undoCount: this._undoStack.length,
            redoCount: this._redoStack.length,
        };
    }
}
