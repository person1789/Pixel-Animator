/**
 * Pixel Animator — Application Bootstrap
 * Wires all modules together, initializes UI, binds events.
 */
import { EventBus, Events } from './events.js';
import { ProjectState } from './state.js';
import { Renderer } from './canvas/renderer.js';
import { CoordinateMapper } from './canvas/coordinates.js';
import { ToolManager } from './tools/tool-manager.js';
import { PencilTool } from './tools/pencil.js';
import { EraserTool } from './tools/eraser.js';
import { BucketTool } from './tools/bucket.js';
import { LineTool } from './tools/line.js';
import { RectangleTool } from './tools/rectangle.js';
import { EllipseTool } from './tools/ellipse.js';
import { SelectionTool } from './tools/selection.js';
import { MoveTool } from './tools/move.js';
import { EyedropperTool } from './tools/eyedropper.js';
import { MirrorPenTool } from './tools/mirror-pen.js';
import { LayerManager } from './layers/layer-manager.js';
import { PaletteManager } from './palette/palette-manager.js';
import { ColorPicker } from './palette/color-picker.js';
import { Timeline } from './animation/timeline.js';
import { PlaybackEngine } from './animation/playback.js';
import { OnionSkin } from './animation/onion-skin.js';
import { HistoryManager } from './history/history-manager.js';
import { PNGExporter } from './io/export-png.js';
import { GIFExporter } from './io/export-gif.js';
import { SpriteSheetExporter } from './io/export-spritesheet.js';
import { ProjectIO } from './io/save-project.js';
import { ImageImporter } from './io/import-image.js';

class PixelAnimatorApp {
    constructor() {
        // Core
        this.bus = new EventBus();
        this.state = new ProjectState(this.bus);

        // Canvas
        const canvas = document.getElementById('main-canvas');
        this.renderer = new Renderer(this.state, this.bus, canvas);
        this.coordMapper = new CoordinateMapper(this.state, canvas);

        // History
        this.history = new HistoryManager(this.state, this.bus);

        // Tools
        this.toolManager = new ToolManager(this.state, this.bus, this.renderer, this.coordMapper);
        this._registerTools();

        // Layers
        this.layerManager = new LayerManager(this.state, this.bus);

        // Palette
        this.paletteManager = new PaletteManager(this.state, this.bus);
        this.colorPicker = new ColorPicker(this.state, this.bus);

        // Animation
        this.timeline = new Timeline(this.state, this.bus, this.renderer);
        this.playback = new PlaybackEngine(this.state, this.bus, this.renderer, this.timeline);
        this.onionSkin = new OnionSkin(this.state, this.bus, this.renderer);

        // IO
        this.pngExporter = new PNGExporter(this.state, this.renderer);
        this.gifExporter = new GIFExporter(this.state, this.renderer);
        this.spriteSheetExporter = new SpriteSheetExporter(this.state, this.renderer);
        this.projectIO = new ProjectIO(this.state, this.bus);
        this.imageImporter = new ImageImporter(this.state, this.bus);

        // Open dropdown tracking
        this._openDropdown = null;
    }

    init() {
        // Override the default render to include onion skin
        const originalRender = this.renderer.render.bind(this.renderer);
        this.renderer.render = () => {
            if (!this.onionSkin.render()) {
                originalRender();
            }
            this.playback.updatePreview();
        };

        // Resize canvas
        this.renderer.resize();
        this.renderer.centerView();

        // Initialize UI
        this.paletteManager.renderUI();
        this.layerManager.renderUI();
        this.timeline.renderUI();
        this.colorPicker.init();

        // Bind events
        this._bindCanvasEvents();
        this._bindToolbarEvents();
        this._bindMenuEvents();
        this._bindTimelineEvents();
        this._bindLayerEvents();
        this._bindKeyboardShortcuts();
        this._bindWindowEvents();

        // Initial render
        this.bus.emit(Events.CANVAS_REDRAW);

        // Update status bar
        this._updateStatusBar();

        console.log('🎨 Pixel Animator initialized');
    }

    _registerTools() {
        this.toolManager.register('pencil', new PencilTool(this.state, this.bus, this.history));
        this.toolManager.register('eraser', new EraserTool(this.state, this.bus, this.history));
        this.toolManager.register('bucket', new BucketTool(this.state, this.bus, this.history));
        this.toolManager.register('line', new LineTool(this.state, this.bus, this.history));
        this.toolManager.register('rectangle', new RectangleTool(this.state, this.bus, this.history));
        this.toolManager.register('ellipse', new EllipseTool(this.state, this.bus, this.history));
        this.toolManager.register('selection', new SelectionTool(this.state, this.bus));
        this.toolManager.register('move', new MoveTool(this.state, this.bus, this.history));
        this.toolManager.register('eyedropper', new EyedropperTool(this.state, this.bus));
        this.toolManager.register('mirror-pen', new MirrorPenTool(this.state, this.bus, this.history));
    }

    // ===== Canvas Events =====

    _bindCanvasEvents() {
        const canvas = document.getElementById('main-canvas');

        canvas.addEventListener('mousedown', (e) => {
            if (e.button === 1) {
                // Middle mouse for panning
                this._isPanning = true;
                this._panStart = { x: e.clientX, y: e.clientY };
                canvas.style.cursor = 'grabbing';
                return;
            }
            if (e.button === 0) {
                // Alt+click for eyedropper shortcut
                if (e.altKey) {
                    const pos = this.coordMapper.screenToPixel(e.clientX, e.clientY);
                    if (pos) {
                        const pixel = this.state.getPixel(this.state.currentLayer.data, pos.x, pos.y);
                        if (pixel && pixel.a > 0) {
                            this.state.setPrimaryColor(pixel);
                            this.paletteManager.renderUI();
                        }
                    }
                    return;
                }
                this.toolManager.onMouseDown(e);
            }
        });

        canvas.addEventListener('mousemove', (e) => {
            if (this._isPanning) {
                this.state.panX += e.clientX - this._panStart.x;
                this.state.panY += e.clientY - this._panStart.y;
                this._panStart = { x: e.clientX, y: e.clientY };
                this.bus.emit(Events.CANVAS_REDRAW);
                return;
            }
            this.toolManager.onMouseMove(e);
        });

        canvas.addEventListener('mouseup', (e) => {
            if (this._isPanning) {
                this._isPanning = false;
                canvas.style.cursor = 'crosshair';
                return;
            }
            this.toolManager.onMouseUp(e);
            this.timeline.renderUI();
            this.layerManager.renderUI();
        });

        canvas.addEventListener('mouseleave', (e) => {
            if (this._isPanning) {
                this._isPanning = false;
                canvas.style.cursor = 'crosshair';
            }
            this.toolManager.onMouseUp(e);
        });

        // Zoom with scroll wheel
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -1 : 1;
            const newZoom = this.state.zoom + delta * Math.max(1, Math.floor(this.state.zoom / 4));
            this.state.setZoom(Math.max(1, Math.min(64, newZoom)));
            this._updateStatusBar();
        }, { passive: false });
    }

    // ===== Toolbar Events =====

    _bindToolbarEvents() {
        // Tool buttons
        document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.addEventListener('click', () => {
                const tool = btn.dataset.tool;
                this.toolManager.switchTool(tool);
                this._updateToolUI();
            });
        });

        // Shape mode toggle
        document.querySelectorAll('.shape-mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.state.toolOptions.shapeMode = btn.dataset.mode;
                document.querySelectorAll('.shape-mode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Tool changed event — update toolbar UI
        this.bus.on(Events.TOOL_CHANGED, () => this._updateToolUI());

        // Color swatches
        document.getElementById('primary-color')?.addEventListener('click', () => {
            this.colorPicker.show();
        });

        document.getElementById('swap-colors')?.addEventListener('click', () => {
            this.state.swapColors();
            this.paletteManager.renderUI();
        });

        // Edit palette color button
        document.getElementById('edit-palette-color')?.addEventListener('click', () => {
            this.colorPicker.show();
        });

        // Close color picker
        document.getElementById('close-color-picker')?.addEventListener('click', () => {
            this.colorPicker.hide();
        });
    }

    _updateToolUI() {
        const activeTool = this.state.activeTool;

        // Update button states
        document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === activeTool);
        });

        // Show/hide shape mode toggle
        const shapeToggle = document.getElementById('shape-mode-toggle');
        if (shapeToggle) {
            shapeToggle.style.display =
                (activeTool === 'rectangle' || activeTool === 'ellipse') ? '' : 'none';
        }
    }

    // ===== Menu Events =====

    _bindMenuEvents() {
        // Dropdown toggles
        const menus = {
            'menu-file': 'dropdown-file',
            'menu-edit': 'dropdown-edit',
            'menu-view': 'dropdown-view',
        };

        Object.entries(menus).forEach(([btnId, dropId]) => {
            const btn = document.getElementById(btnId);
            const drop = document.getElementById(dropId);
            if (!btn || !drop) return;

            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this._openDropdown === drop) {
                    this._closeDropdowns();
                } else {
                    this._closeDropdowns();
                    drop.style.display = '';
                    // Position under the button
                    const rect = btn.getBoundingClientRect();
                    drop.style.left = rect.left + 'px';
                    this._openDropdown = drop;
                }
            });
        });

        // Close dropdowns on outside click
        document.addEventListener('click', () => this._closeDropdowns());

        // Prevent dropdown clicks from closing
        document.querySelectorAll('.dropdown-menu').forEach(d => {
            d.addEventListener('click', (e) => e.stopPropagation());
        });

        // File menu actions
        document.getElementById('action-new-project')?.addEventListener('click', () => {
            this._closeDropdowns();
            this._showNewProjectDialog();
        });
        document.getElementById('action-save-project')?.addEventListener('click', () => {
            this._closeDropdowns();
            this.projectIO.save();
        });
        document.getElementById('action-load-project')?.addEventListener('click', () => {
            this._closeDropdowns();
            this.projectIO.load();
        });
        document.getElementById('action-import-image')?.addEventListener('click', () => {
            this._closeDropdowns();
            this.imageImporter.import();
        });
        document.getElementById('action-export-png')?.addEventListener('click', () => {
            this._closeDropdowns();
            this.pngExporter.export(1);
        });
        document.getElementById('action-export-gif')?.addEventListener('click', () => {
            this._closeDropdowns();
            this.gifExporter.export(1);
        });
        document.getElementById('action-export-spritesheet')?.addEventListener('click', () => {
            this._closeDropdowns();
            this.spriteSheetExporter.export();
        });

        // Edit menu actions
        document.getElementById('action-undo')?.addEventListener('click', () => {
            this._closeDropdowns();
            this.history.undo();
            this.layerManager.renderUI();
            this.timeline.renderUI();
        });
        document.getElementById('action-redo')?.addEventListener('click', () => {
            this._closeDropdowns();
            this.history.redo();
            this.layerManager.renderUI();
            this.timeline.renderUI();
        });
        document.getElementById('action-clear-layer')?.addEventListener('click', () => {
            this._closeDropdowns();
            this.layerManager.clearCurrentLayer();
            this.layerManager.renderUI();
            this.timeline.renderUI();
        });

        // View menu actions
        document.getElementById('action-toggle-grid')?.addEventListener('click', () => {
            this._closeDropdowns();
            this.state.showGrid = !this.state.showGrid;
            this.bus.emit(Events.CANVAS_REDRAW);
        });
        document.getElementById('action-toggle-onion')?.addEventListener('click', () => {
            this._closeDropdowns();
            this.onionSkin.toggle();
            this._updateOnionButton();
        });
        document.getElementById('action-zoom-in')?.addEventListener('click', () => {
            this._closeDropdowns();
            this.state.setZoom(this.state.zoom + Math.max(1, Math.floor(this.state.zoom / 4)));
            this._updateStatusBar();
        });
        document.getElementById('action-zoom-out')?.addEventListener('click', () => {
            this._closeDropdowns();
            this.state.setZoom(this.state.zoom - Math.max(1, Math.floor(this.state.zoom / 4)));
            this._updateStatusBar();
        });
        document.getElementById('action-zoom-fit')?.addEventListener('click', () => {
            this._closeDropdowns();
            const canvas = document.getElementById('main-canvas');
            const maxZoom = Math.floor(Math.min(
                canvas.width / this.state.canvasWidth,
                canvas.height / this.state.canvasHeight
            ) * 0.85);
            this.state.setZoom(Math.max(1, maxZoom));
            this.renderer.centerView();
            this._updateStatusBar();
        });

        // New project dialog
        const preset = document.getElementById('new-project-preset');
        preset?.addEventListener('change', () => {
            const custom = document.getElementById('custom-size-group');
            if (custom) custom.style.display = preset.value === 'custom' ? '' : 'none';
        });

        document.getElementById('new-project-cancel')?.addEventListener('click', () => {
            document.getElementById('new-project-dialog').style.display = 'none';
        });

        document.getElementById('new-project-create')?.addEventListener('click', () => {
            const preset = document.getElementById('new-project-preset').value;
            let w, h;
            if (preset === 'custom') {
                w = parseInt(document.getElementById('new-project-width').value) || 32;
                h = parseInt(document.getElementById('new-project-height').value) || 32;
            } else {
                w = h = parseInt(preset);
            }
            w = Math.max(1, Math.min(256, w));
            h = Math.max(1, Math.min(256, h));

            this.state.newProject(w, h);
            this.renderer.resize();
            this.renderer.centerView();
            this.history.clear();
            this.layerManager.renderUI();
            this.timeline.renderUI();
            this.paletteManager.renderUI();
            this._updateStatusBar();

            document.getElementById('new-project-dialog').style.display = 'none';
        });
    }

    _showNewProjectDialog() {
        document.getElementById('new-project-dialog').style.display = '';
    }

    _closeDropdowns() {
        document.querySelectorAll('.dropdown-menu').forEach(d => d.style.display = 'none');
        this._openDropdown = null;
    }

    // ===== Timeline Events =====

    _bindTimelineEvents() {
        document.getElementById('anim-first')?.addEventListener('click', () => this.timeline.goFirst());
        document.getElementById('anim-prev')?.addEventListener('click', () => this.timeline.goPrev());
        document.getElementById('anim-play')?.addEventListener('click', () => {
            this.playback.togglePlayPause();
            this._updatePlayButton();
        });
        document.getElementById('anim-next')?.addEventListener('click', () => this.timeline.goNext());
        document.getElementById('anim-last')?.addEventListener('click', () => this.timeline.goLast());

        document.getElementById('fps-input')?.addEventListener('change', (e) => {
            this.state.fps = Math.max(1, Math.min(60, parseInt(e.target.value) || 12));
            e.target.value = this.state.fps;
        });

        document.getElementById('toggle-loop')?.addEventListener('click', () => {
            this.state.loopPlayback = !this.state.loopPlayback;
            const btn = document.getElementById('toggle-loop');
            btn?.classList.toggle('timeline-btn--active', this.state.loopPlayback);
        });

        document.getElementById('toggle-onion-skin')?.addEventListener('click', () => {
            this.onionSkin.toggle();
            this._updateOnionButton();
        });

        document.getElementById('add-frame')?.addEventListener('click', () => this.timeline.addFrame());
        document.getElementById('delete-frame')?.addEventListener('click', () => this.timeline.deleteFrame());
        document.getElementById('duplicate-frame')?.addEventListener('click', () => this.timeline.duplicateFrame());

        // Update play button when playback state changes
        this.bus.on(Events.PLAYBACK_STATE_CHANGED, () => this._updatePlayButton());
    }

    _updatePlayButton() {
        const btn = document.getElementById('anim-play');
        if (!btn) return;
        if (this.state.isPlaying) {
            btn.textContent = '⏸';
            btn.classList.add('playing');
        } else {
            btn.textContent = '▶';
            btn.classList.remove('playing');
        }
    }

    _updateOnionButton() {
        const btn = document.getElementById('toggle-onion-skin');
        btn?.classList.toggle('timeline-btn--active', this.state.onionSkinEnabled);
    }

    // ===== Layer Events =====

    _bindLayerEvents() {
        document.getElementById('add-layer')?.addEventListener('click', () => this.layerManager.addLayer());
        document.getElementById('delete-layer')?.addEventListener('click', () => this.layerManager.deleteLayer());
        document.getElementById('duplicate-layer')?.addEventListener('click', () => this.layerManager.duplicateLayer());
        document.getElementById('merge-layer-down')?.addEventListener('click', () => this.layerManager.mergeDown());
    }

    // ===== Keyboard Shortcuts =====

    _bindKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts when typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

            const ctrl = e.ctrlKey || e.metaKey;
            const shift = e.shiftKey;

            // Ctrl shortcuts
            if (ctrl) {
                switch (e.key.toLowerCase()) {
                    case 'z':
                        e.preventDefault();
                        if (shift) { this.history.redo(); }
                        else { this.history.undo(); }
                        this.layerManager.renderUI();
                        this.timeline.renderUI();
                        return;
                    case 'n':
                        e.preventDefault();
                        this._showNewProjectDialog();
                        return;
                    case 's':
                        e.preventDefault();
                        this.projectIO.save();
                        return;
                    case 'o':
                        e.preventDefault();
                        this.projectIO.load();
                        return;
                }
            }

            // Tool shortcuts (no modifier)
            if (!ctrl && !shift) {
                switch (e.key.toLowerCase()) {
                    case 'b': this.toolManager.switchTool('pencil'); break;
                    case 'e': this.toolManager.switchTool('eraser'); break;
                    case 'f': this.toolManager.switchTool('bucket'); break;
                    case 'l': this.toolManager.switchTool('line'); break;
                    case 'r': this.toolManager.switchTool('rectangle'); break;
                    case 'c': this.toolManager.switchTool('ellipse'); break;
                    case 's': this.toolManager.switchTool('selection'); break;
                    case 'v': this.toolManager.switchTool('move'); break;
                    case 'i': this.toolManager.switchTool('eyedropper'); break;
                    case 'm': this.toolManager.switchTool('mirror-pen'); break;
                    case 'x': this.state.swapColors(); this.paletteManager.renderUI(); break;
                    case 'g':
                        this.state.showGrid = !this.state.showGrid;
                        this.bus.emit(Events.CANVAS_REDRAW);
                        break;
                    case 'o':
                        this.onionSkin.toggle();
                        this._updateOnionButton();
                        break;
                    case ' ':
                        e.preventDefault();
                        this.playback.togglePlayPause();
                        this._updatePlayButton();
                        break;
                    case 'delete':
                        this.layerManager.clearCurrentLayer();
                        this.layerManager.renderUI();
                        this.timeline.renderUI();
                        break;
                    case '=':
                    case '+':
                        this.state.setZoom(this.state.zoom + Math.max(1, Math.floor(this.state.zoom / 4)));
                        this._updateStatusBar();
                        break;
                    case '-':
                        this.state.setZoom(this.state.zoom - Math.max(1, Math.floor(this.state.zoom / 4)));
                        this._updateStatusBar();
                        break;
                    case '0':
                        this.renderer.centerView();
                        this.bus.emit(Events.CANVAS_REDRAW);
                        break;
                    case 'arrowleft':
                        this.timeline.goPrev();
                        break;
                    case 'arrowright':
                        this.timeline.goNext();
                        break;
                }
            }
        });
    }

    // ===== Window Events =====

    _bindWindowEvents() {
        window.addEventListener('resize', () => {
            this.renderer.resize();
            this.renderer.centerView();
        });

        // Prevent right-click context menu on canvas
        document.getElementById('main-canvas')?.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }

    // ===== Status Bar =====

    _updateStatusBar() {
        const dims = document.getElementById('status-dimensions');
        const zoom = document.getElementById('status-zoom');
        if (dims) dims.textContent = `${this.state.canvasWidth}×${this.state.canvasHeight}`;
        if (zoom) zoom.textContent = `${this.state.zoom}×`;
    }
}

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
    const app = new PixelAnimatorApp();
    app.init();
});
