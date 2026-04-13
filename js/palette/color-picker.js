/**
 * Color Picker — HSL color picker with RGB/Hex inputs.
 * Renders to canvas elements for the picker area, hue slider, and alpha slider.
 */
import { Events } from '../events.js';

export class ColorPicker {
    constructor(state, bus) {
        this.state = state;
        this.bus = bus;

        this._hue = 0;
        this._saturation = 1;
        this._lightness = 0.5;
        this._alpha = 255;

        this._isPickerDragging = false;
        this._isHueDragging = false;
        this._isAlphaDragging = false;

        this._pickerCanvas = null;
        this._hueCanvas = null;
        this._alphaCanvas = null;
    }

    init() {
        this._pickerCanvas = document.getElementById('color-picker-canvas');
        this._hueCanvas = document.getElementById('hue-slider-canvas');
        this._alphaCanvas = document.getElementById('alpha-slider-canvas');

        if (!this._pickerCanvas || !this._hueCanvas || !this._alphaCanvas) return;

        // Picker area events
        this._pickerCanvas.addEventListener('mousedown', (e) => {
            this._isPickerDragging = true;
            this._updateFromPicker(e);
        });

        // Hue slider events
        this._hueCanvas.addEventListener('mousedown', (e) => {
            this._isHueDragging = true;
            this._updateFromHue(e);
        });

        // Alpha slider events
        this._alphaCanvas.addEventListener('mousedown', (e) => {
            this._isAlphaDragging = true;
            this._updateFromAlpha(e);
        });

        document.addEventListener('mousemove', (e) => {
            if (this._isPickerDragging) this._updateFromPicker(e);
            if (this._isHueDragging) this._updateFromHue(e);
            if (this._isAlphaDragging) this._updateFromAlpha(e);
        });

        document.addEventListener('mouseup', () => {
            this._isPickerDragging = false;
            this._isHueDragging = false;
            this._isAlphaDragging = false;
        });

        // RGB/Hex input handlers
        ['color-r', 'color-g', 'color-b', 'color-a'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', () => this._updateFromInputs());
            }
        });

        const hexInput = document.getElementById('color-hex');
        if (hexInput) {
            hexInput.addEventListener('change', () => this._updateFromHex());
        }

        this._renderAll();
    }

    show() {
        const panel = document.getElementById('color-picker-panel');
        if (panel) {
            panel.style.display = '';
            this._syncFromState();
            this._renderAll();
        }
    }

    hide() {
        const panel = document.getElementById('color-picker-panel');
        if (panel) panel.style.display = 'none';
    }

    _syncFromState() {
        const c = this.state.primaryColor;
        const hsl = this._rgbToHsl(c.r, c.g, c.b);
        this._hue = hsl.h;
        this._saturation = hsl.s;
        this._lightness = hsl.l;
        this._alpha = c.a;
        this._updateInputs();
    }

    _renderAll() {
        this._renderPicker();
        this._renderHueSlider();
        this._renderAlphaSlider();
    }

    _renderPicker() {
        const canvas = this._pickerCanvas;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;

        // Draw saturation-lightness gradient for current hue
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const s = x / w;
                const l = 1 - y / h;
                const rgb = this._hslToRgb(this._hue, s, l);
                ctx.fillStyle = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
                ctx.fillRect(x, y, 1, 1);
            }
        }

        // Draw crosshair
        const cx = this._saturation * w;
        const cy = (1 - this._lightness) * h;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.stroke();
    }

    _renderHueSlider() {
        const canvas = this._hueCanvas;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;

        // Draw hue gradient
        const gradient = ctx.createLinearGradient(0, 0, w, 0);
        for (let i = 0; i <= 360; i += 30) {
            const rgb = this._hslToRgb(i, 1, 0.5);
            gradient.addColorStop(i / 360, `rgb(${rgb.r},${rgb.g},${rgb.b})`);
        }
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);

        // Draw indicator
        const ix = (this._hue / 360) * w;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(ix - 3, 0, 6, h);
    }

    _renderAlphaSlider() {
        const canvas = this._alphaCanvas;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;

        // Checkerboard
        const size = 4;
        for (let y = 0; y < h; y += size) {
            for (let x = 0; x < w; x += size) {
                ctx.fillStyle = ((x + y) / size % 2 === 0) ? '#ccc' : '#888';
                ctx.fillRect(x, y, size, size);
            }
        }

        // Alpha gradient
        const rgb = this._hslToRgb(this._hue, this._saturation, this._lightness);
        const gradient = ctx.createLinearGradient(0, 0, w, 0);
        gradient.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
        gradient.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},1)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);

        // Indicator
        const ix = (this._alpha / 255) * w;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(ix - 3, 0, 6, h);
    }

    _updateFromPicker(e) {
        const rect = this._pickerCanvas.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
        this._saturation = x;
        this._lightness = 1 - y;
        this._applyColor();
        this._renderAll();
    }

    _updateFromHue(e) {
        const rect = this._hueCanvas.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        this._hue = x * 360;
        this._applyColor();
        this._renderAll();
    }

    _updateFromAlpha(e) {
        const rect = this._alphaCanvas.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        this._alpha = Math.round(x * 255);
        this._applyColor();
        this._renderAll();
    }

    _updateFromInputs() {
        const r = parseInt(document.getElementById('color-r').value) || 0;
        const g = parseInt(document.getElementById('color-g').value) || 0;
        const b = parseInt(document.getElementById('color-b').value) || 0;
        const a = parseInt(document.getElementById('color-a').value) || 255;

        const hsl = this._rgbToHsl(r, g, b);
        this._hue = hsl.h;
        this._saturation = hsl.s;
        this._lightness = hsl.l;
        this._alpha = a;

        this._applyColor();
        this._renderAll();
    }

    _updateFromHex() {
        let hex = document.getElementById('color-hex').value.replace('#', '');
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
        if (hex.length !== 6) return;

        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);

        const hsl = this._rgbToHsl(r, g, b);
        this._hue = hsl.h;
        this._saturation = hsl.s;
        this._lightness = hsl.l;

        this._applyColor();
        this._renderAll();
    }

    _applyColor() {
        const rgb = this._hslToRgb(this._hue, this._saturation, this._lightness);
        this.state.setPrimaryColor({ r: rgb.r, g: rgb.g, b: rgb.b, a: this._alpha });
        this._updateInputs();
    }

    _updateInputs() {
        const c = this.state.primaryColor;
        const rEl = document.getElementById('color-r');
        const gEl = document.getElementById('color-g');
        const bEl = document.getElementById('color-b');
        const aEl = document.getElementById('color-a');
        const hexEl = document.getElementById('color-hex');

        if (rEl) rEl.value = c.r;
        if (gEl) gEl.value = c.g;
        if (bEl) bEl.value = c.b;
        if (aEl) aEl.value = c.a;
        if (hexEl) hexEl.value = this._rgbToHex(c.r, c.g, c.b);
    }

    // --- Color Conversion ---

    _hslToRgb(h, s, l) {
        h = h / 360;
        let r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }
        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255),
        };
    }

    _rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s;
        const l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
            h *= 360;
        }
        return { h, s, l };
    }

    _rgbToHex(r, g, b) {
        return [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
    }
}
