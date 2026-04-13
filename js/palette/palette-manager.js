/**
 * Palette Manager — manages color palette state, presets, and UI.
 */
import { Events } from '../events.js';

export class PaletteManager {
    constructor(state, bus) {
        this.state = state;
        this.bus = bus;
        this._activePaletteIndex = 0;

        this.bus.on(Events.COLOR_CHANGED, () => this.renderUI());
        this.bus.on(Events.PROJECT_LOADED, () => this.renderUI());
    }

    /**
     * Set a color from the palette as the primary color.
     */
    selectColor(index) {
        const hex = this.state.palette[index];
        if (!hex) return;
        const color = this._hexToRgba(hex);
        this.state.setPrimaryColor(color);
        this._activePaletteIndex = index;
        this.renderUI();
    }

    /**
     * Add a color to the palette.
     */
    addColor(hex) {
        this.state.palette.push(hex);
        this.bus.emit(Events.PALETTE_CHANGED);
        this.renderUI();
    }

    /**
     * Update a palette color.
     */
    updateColor(index, hex) {
        if (index >= 0 && index < this.state.palette.length) {
            this.state.palette[index] = hex;
            this.bus.emit(Events.PALETTE_CHANGED);
            this.renderUI();
        }
    }

    /**
     * Load a preset palette.
     */
    loadPreset(colors) {
        this.state.palette = [...colors];
        this._activePaletteIndex = 0;
        this.bus.emit(Events.PALETTE_CHANGED);
        this.renderUI();
    }

    /**
     * Render the palette grid UI.
     */
    renderUI() {
        const container = document.getElementById('palette-grid');
        if (!container) return;
        container.innerHTML = '';

        this.state.palette.forEach((hex, i) => {
            const swatch = document.createElement('div');
            swatch.classList.add('palette-swatch');
            swatch.style.backgroundColor = hex;
            if (i === this._activePaletteIndex) swatch.classList.add('active');

            swatch.addEventListener('click', () => this.selectColor(i));
            swatch.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                // Right-click sets secondary color
                const color = this._hexToRgba(hex);
                this.state.setSecondaryColor(color);
            });

            container.appendChild(swatch);
        });

        // Update color swatches in toolbar
        this._updateSwatches();
    }

    _updateSwatches() {
        const primary = document.getElementById('primary-color');
        const secondary = document.getElementById('secondary-color');
        if (primary) {
            const c = this.state.primaryColor;
            primary.style.backgroundColor = `rgba(${c.r},${c.g},${c.b},${c.a / 255})`;
        }
        if (secondary) {
            const c = this.state.secondaryColor;
            secondary.style.backgroundColor = `rgba(${c.r},${c.g},${c.b},${c.a / 255})`;
        }
    }

    _hexToRgba(hex) {
        hex = hex.replace('#', '');
        return {
            r: parseInt(hex.substr(0, 2), 16),
            g: parseInt(hex.substr(2, 2), 16),
            b: parseInt(hex.substr(4, 2), 16),
            a: 255,
        };
    }
}
