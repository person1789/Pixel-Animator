/**
 * Context Menu — handles showing/hiding and selection of rapid reordering/deletion options.
 */
export class ContextMenu {
    constructor(state, bus) {
        this.state = state;
        this.bus = bus;
        this.element = document.getElementById('context-menu');
        this._currentActions = [];

        // Global click to close
        document.addEventListener('mousedown', (e) => {
            if (this.element && this.element.style.display !== 'none' && !this.element.contains(e.target)) {
                this.hide();
            }
        });

        // Global context menu prevention (optional, usually handled per-element)
        // But we definitely want to prevent it on the menu itself
        this.element?.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    /**
     * Show the menu at the cursor position.
     * @param {number} x Screen X
     * @param {number} y Screen Y
     * @param {Array} items List of { label, action, danger }
     */
    show(x, y, items) {
        if (!this.element) return;

        this.element.innerHTML = '';
        this._currentActions = items;

        items.forEach(item => {
            if (item.type === 'divider') {
                const div = document.createElement('div');
                div.classList.add('context-menu-divider');
                this.element.appendChild(div);
                return;
            }

            const btn = document.createElement('div');
            btn.classList.add('context-menu-item');
            if (item.danger) btn.classList.add('context-menu-item--danger');
            if (item.disabled) btn.classList.add('context-menu-item--disabled');
            btn.textContent = item.label;

            btn.addEventListener('click', (e) => {
                if (item.disabled) {
                    e.stopPropagation();
                    return;
                }
                item.action();
                this.hide();
            });

            this.element.appendChild(btn);
        });

        // Position and reveal
        this.element.style.display = 'block';
        
        // Bounds checking
        const rect = this.element.getBoundingClientRect();
        const winW = window.innerWidth;
        const winH = window.innerHeight;

        // Use client coordinates (relative to viewport)
        let posX = x;
        let posY = y;

        // Flip if hitting edges
        if (posX + rect.width > winW) posX = winW - rect.width - 5;
        if (posY + rect.height > winH) posY = winH - rect.height - 5;
        if (posX < 0) posX = 5;
        if (posY < 0) posY = 5;

        this.element.style.left = `${posX}px`;
        this.element.style.top = `${posY}px`;

        // Add class for animation reset
        this.element.classList.remove('context-menu--active');
        void this.element.offsetWidth; // Trigger reflow
        this.element.classList.add('context-menu--active');
    }

    hide() {
        if (this.element) {
            this.element.style.display = 'none';
        }
    }
}
