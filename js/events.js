/**
 * Lightweight publish/subscribe event bus for decoupled communication.
 */
export class EventBus {
    constructor() {
        this._listeners = new Map();
    }

    /**
     * Subscribe to an event.
     * @param {string} event
     * @param {Function} callback
     * @returns {Function} Unsubscribe function
     */
    on(event, callback) {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, new Set());
        }
        this._listeners.get(event).add(callback);
        return () => this._listeners.get(event)?.delete(callback);
    }

    /**
     * Subscribe to an event, but only fire once.
     */
    once(event, callback) {
        const unsub = this.on(event, (...args) => {
            unsub();
            callback(...args);
        });
        return unsub;
    }

    /**
     * Emit an event with optional data.
     * @param {string} event
     * @param {*} data
     */
    emit(event, data) {
        const listeners = this._listeners.get(event);
        if (listeners) {
            for (const cb of listeners) {
                try {
                    cb(data);
                } catch (e) {
                    console.error(`EventBus error on "${event}":`, e);
                }
            }
        }
    }

    /**
     * Remove all listeners for an event, or all events.
     */
    off(event) {
        if (event) {
            this._listeners.delete(event);
        } else {
            this._listeners.clear();
        }
    }
}

// Event name constants
export const Events = {
    STATE_CHANGED: 'stateChanged',
    TOOL_CHANGED: 'toolChanged',
    FRAME_CHANGED: 'frameChanged',
    LAYER_CHANGED: 'layerChanged',
    COLOR_CHANGED: 'colorChanged',
    CANVAS_REDRAW: 'canvasRedraw',
    ZOOM_CHANGED: 'zoomChanged',
    PALETTE_CHANGED: 'paletteChanged',
    HISTORY_CHANGED: 'historyChanged',
    PROJECT_LOADED: 'projectLoaded',
    SELECTION_CHANGED: 'selectionChanged',
    ONION_SKIN_CHANGED: 'onionSkinChanged',
    PLAYBACK_STATE_CHANGED: 'playbackStateChanged',
};
