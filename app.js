/* ========================================
   ORG CHART DATA — Extracted from image
   ======================================== */
const DEFAULT_DATA = {
    id: "1",
    name: "Vlastimil Venclik",
    title: "Group CEO",
    children: [
        {
            id: "2",
            name: "Klara Sechova",
            title: "Group HR",
            children: [
                { id: "2a", name: "HR Team(s)", title: "Team", isTeam: true, children: [] }
            ]
        },
        {
            id: "3",
            name: "Milan",
            title: "Group CFO",
            children: [
                { id: "3a", name: "Finance Team(s)", title: "Team", isTeam: true, children: [] }
            ]
        },
        {
            id: "4",
            name: "Vendula",
            title: "Group CMO",
            children: [
                { id: "4a", name: "Marketing Team(s)", title: "Team", isTeam: true, children: [] }
            ]
        },
        {
            id: "5",
            name: "Prokop",
            title: "Group Head of Quants",
            children: [
                { id: "5a", name: "TBD", title: "Gadget Quant", children: [] },
                { id: "5b", name: "TBD", title: "Gadget Head of Quants", children: [] },
                { id: "5c", name: "TBD", title: "Gadget Quant", children: [] }
            ]
        },
        {
            id: "6",
            name: "Alexander Chernavin",
            title: "COO",
            children: [
                {
                    id: "6a",
                    name: "Andrea Spiteri",
                    title: "Product Manager",
                    children: [
                        { id: "6a1", name: "Dunja Kozić", title: "Product Manager", children: [] },
                        { id: "6a2", name: "Alex Cartier", title: "Product Manager", children: [] },
                        { id: "6a3", name: "Martin Dostal", title: "Product Manager", children: [] },
                        { id: "6a4", name: "Niko Krassikov", title: "UX/UI Designer", children: [] }
                    ]
                },
                { id: "6b", name: "Ivan Kostyuchenko", title: "Marketing Manager", children: [] },
                { id: "6c", name: "Angie Regalado", title: "HR Manager", children: [] },
                { id: "6d", name: "Vladyslav Shestachenko", title: "Trading Manager", children: [] },
                {
                    id: "6e",
                    name: "Nedda Kaltcheva",
                    title: "Chief Tech Officer",
                    children: [
                        {
                            id: "6e1",
                            name: "Václav Ryška",
                            title: "Engineering Manager - Core",
                            children: [
                                {
                                    id: "6e1a",
                                    name: "Martin Eliáš",
                                    title: "Tech Lead",
                                    children: [
                                        { id: "6e1a1", name: "Aayush Bhaglal", title: "Engineer", children: [] },
                                        { id: "6e1a2", name: "Chandra Shekhar", title: "Engineer", children: [] },
                                        { id: "6e1a3", name: "David Zirnsák", title: "Engineer", children: [] }
                                    ]
                                },
                                {
                                    id: "6e1b",
                                    name: "Pavel Macháň",
                                    title: "Tech Lead",
                                    children: [
                                        { id: "6e1b1", name: "Deavyansh Gautam", title: "Engineer", children: [] },
                                        { id: "6e1b2", name: "Parath Singh", title: "Engineer", children: [] },
                                        { id: "6e1b3", name: "Vishnu Sureshkumar", title: "Engineer", children: [] }
                                    ]
                                }
                            ]
                        },
                        {
                            id: "6e2",
                            name: "Michal Kelčík",
                            title: "Tech Lead - Iframe",
                            children: [
                                { id: "6e2a", name: "Aliaksei Lizurchyk", title: "Engineer", children: [] },
                                { id: "6e2b", name: "Eugeniusz Kuryło", title: "Engineer", children: [] },
                                { id: "6e2c", name: "Matus Mlich", title: "Engineer", children: [] }
                            ]
                        },
                        { id: "6e4", name: "Steven Acreman", title: "Team Lead - Infra", children: [] },
                        {
                            id: "6e5",
                            name: "Teodor Kirkov",
                            title: "Team Lead - QA",
                            children: [
                                { id: "6e5a", name: "Vitalii Dziubenko", title: "QA Engineer", children: [] }
                            ]
                        },
                        { id: "6e6", name: "Huseyn", title: "Engineer", children: [] },
                        { id: "6e7", name: "Pavel Černý", title: "Engineer", children: [] }
                    ]
                }
            ]
        }
    ]
};

/* ========================================
   APP STATE
   ======================================== */
class OrgChartApp {
    constructor() {
        this.data = this.loadData();
        this.selectedNodeId = null;
        this.collapsedNodes = new Set(JSON.parse(localStorage.getItem('orgchart_collapsed') || '[]'));
        this.nodePositions = new Map();
        this.nodeElements = new Map();

        // Pan & Zoom
        this.scale = 1;
        this.panX = 0;
        this.panY = 0;
        this.isPanning = false;
        this.startPanX = 0;
        this.startPanY = 0;

        // Drag & Drop
        this.dragNode = null;
        this.dragGhost = null;

        // DOM refs
        this.canvas = document.getElementById('canvas');
        this.canvasWrapper = document.getElementById('canvas-wrapper');
        this.chartEl = document.getElementById('chart');
        this.svgEl = document.getElementById('connectors');
        this.contextMenu = document.getElementById('context-menu');
        this.editModal = document.getElementById('edit-modal');

        this.init();
    }

    /* ---- Persistence ---- */
    loadData() {
        const saved = localStorage.getItem('orgchart_data');
        if (saved) {
            try { return JSON.parse(saved); }
            catch { /* fall through */ }
        }
        return JSON.parse(JSON.stringify(DEFAULT_DATA));
    }

    saveData() {
        localStorage.setItem('orgchart_data', JSON.stringify(this.data));
        localStorage.setItem('orgchart_collapsed', JSON.stringify([...this.collapsedNodes]));
    }

    /* ---- Init ---- */
    init() {
        this.render();
        this.bindEvents();
        this.fitToView();
    }

    /* ---- Find node helpers ---- */
    findNode(id, node = this.data) {
        if (node.id === id) return node;
        for (const child of (node.children || [])) {
            const found = this.findNode(id, child);
            if (found) return found;
        }
        return null;
    }

    findParent(id, node = this.data, parent = null) {
        if (node.id === id) return parent;
        for (const child of (node.children || [])) {
            const found = this.findParent(id, child, node);
            if (found) return found;
        }
        return null;
    }

    removeNode(id, node = this.data) {
        if (!node.children) return false;
        const idx = node.children.findIndex(c => c.id === id);
        if (idx !== -1) {
            node.children.splice(idx, 1);
            return true;
        }
        for (const child of node.children) {
            if (this.removeNode(id, child)) return true;
        }
        return false;
    }

    generateId() {
        return 'n_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    }

    /* ---- Layout Engine ---- */
    layoutTree(node, depth = 0) {
        const nodeW = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--node-width')) || 180;
        const gapX = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--node-gap-x')) || 24;
        const gapY = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--node-gap-y')) || 70;
        const cardH = 90;

        const computeWidth = (n) => {
            const children = (n.children || []);
            const isCollapsed = this.collapsedNodes.has(n.id);
            if (children.length === 0 || isCollapsed) return nodeW;
            let total = 0;
            children.forEach((c, i) => {
                total += computeWidth(c);
                if (i < children.length - 1) total += gapX;
            });
            return Math.max(total, nodeW);
        };

        const positions = new Map();

        const positionNode = (n, x, y) => {
            const w = computeWidth(n);
            const nodeX = x + w / 2 - nodeW / 2;
            positions.set(n.id, { x: nodeX, y, w: nodeW, h: cardH });

            const children = (n.children || []);
            const isCollapsed = this.collapsedNodes.has(n.id);
            if (children.length === 0 || isCollapsed) return;

            let childX = x;
            const childY = y + cardH + gapY;
            children.forEach((c, i) => {
                const cw = computeWidth(c);
                positionNode(c, childX, childY);
                childX += cw + gapX;
            });
        };

        positionNode(node, 0, 0);
        return positions;
    }

    /* ---- Render ---- */
    render() {
        this.nodePositions = this.layoutTree(this.data);
        this.chartEl.innerHTML = '';
        this.nodeElements.clear();

        // Calculate chart bounds
        let maxX = 0, maxY = 0;
        this.nodePositions.forEach(pos => {
            maxX = Math.max(maxX, pos.x + pos.w);
            maxY = Math.max(maxY, pos.y + pos.h);
        });

        this.chartEl.style.width = (maxX + 60) + 'px';
        this.chartEl.style.height = (maxY + 60) + 'px';

        // Render nodes
        this.renderNode(this.data);

        // Render connectors
        this.renderConnectors();

        this.saveData();
    }

    renderNode(node) {
        const pos = this.nodePositions.get(node.id);
        if (!pos) return;

        const el = document.createElement('div');
        el.className = 'org-node';
        el.dataset.id = node.id;
        el.style.left = pos.x + 'px';
        el.style.top = pos.y + 'px';

        const initials = this.getInitials(node.name);
        const avatarClass = node.isTeam ? 'node-avatar team' : 'node-avatar';
        const avatarIcon = node.isTeam
            ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'
            : initials;

        const hasChildren = node.children && node.children.length > 0;
        const isCollapsed = this.collapsedNodes.has(node.id);

        el.innerHTML = `
            <div class="node-card${this.selectedNodeId === node.id ? ' selected' : ''}" 
                 draggable="true" data-id="${node.id}">
                <div class="node-actions">
                    <button class="node-action-btn add-btn" data-action="add-child" data-id="${node.id}" title="Add child">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </button>
                    ${node.id !== this.data.id ? `
                    <button class="node-action-btn delete-btn" data-action="delete" data-id="${node.id}" title="Delete">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>` : ''}
                </div>
                <div class="${avatarClass}">${avatarIcon}</div>
                <div class="node-name">${this.escapeHtml(node.name)}</div>
                ${node.title ? `<div class="node-title">${this.escapeHtml(node.title)}</div>` : ''}
            </div>
            ${hasChildren ? `
                <button class="collapse-toggle${isCollapsed ? ' collapsed' : ''}" data-id="${node.id}" title="${isCollapsed ? 'Expand' : 'Collapse'}">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="6 9 12 15 18 9"/></svg>
                </button>` : ''}
        `;

        this.chartEl.appendChild(el);
        this.nodeElements.set(node.id, el);

        // Render children unless collapsed
        if (hasChildren && !isCollapsed) {
            node.children.forEach(child => this.renderNode(child));
        }
    }

    renderConnectors() {
        this.svgEl.innerHTML = '';

        // Set SVG size to match chart
        const chartW = parseInt(this.chartEl.style.width) || 2000;
        const chartH = parseInt(this.chartEl.style.height) || 1500;
        this.svgEl.setAttribute('width', chartW);
        this.svgEl.setAttribute('height', chartH);
        this.svgEl.setAttribute('viewBox', `0 0 ${chartW} ${chartH}`);

        this.drawConnectors(this.data);
    }

    drawConnectors(node) {
        const children = node.children || [];
        const isCollapsed = this.collapsedNodes.has(node.id);
        if (children.length === 0 || isCollapsed) return;

        const parentPos = this.nodePositions.get(node.id);
        if (!parentPos) return;

        const px = parentPos.x + parentPos.w / 2;
        const py = parentPos.y + parentPos.h;

        children.forEach(child => {
            const childPos = this.nodePositions.get(child.id);
            if (!childPos) return;

            const cx = childPos.x + childPos.w / 2;
            const cy = childPos.y;
            const midY = py + (cy - py) / 2;

            const path = `M ${px} ${py} L ${px} ${midY} L ${cx} ${midY} L ${cx} ${cy}`;

            // Glow layer
            const glow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            glow.setAttribute('d', path);
            glow.setAttribute('class', 'connector-glow');
            this.svgEl.appendChild(glow);

            // Main line
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            line.setAttribute('d', path);
            line.setAttribute('class', 'connector-line');
            this.svgEl.appendChild(line);

            this.drawConnectors(child);
        });
    }

    /* ---- Events ---- */
    bindEvents() {
        // Pan
        this.canvasWrapper.addEventListener('mousedown', (e) => {
            if (e.target.closest('.node-card') || e.target.closest('button')) return;
            this.isPanning = true;
            this.startPanX = e.clientX - this.panX;
            this.startPanY = e.clientY - this.panY;
            this.canvasWrapper.style.cursor = 'grabbing';
        });

        window.addEventListener('mousemove', (e) => {
            if (this.isPanning) {
                this.panX = e.clientX - this.startPanX;
                this.panY = e.clientY - this.startPanY;
                this.updateTransform();
            }

            // Drag ghost follow
            if (this.dragGhost) {
                this.dragGhost.style.left = (e.clientX - 90) + 'px';
                this.dragGhost.style.top = (e.clientY - 45) + 'px';
            }
        });

        window.addEventListener('mouseup', () => {
            this.isPanning = false;
            this.canvasWrapper.style.cursor = 'grab';
        });

        // Zoom
        this.canvasWrapper.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            const newScale = Math.max(0.2, Math.min(3, this.scale * delta));

            // Zoom toward cursor
            const rect = this.canvasWrapper.getBoundingClientRect();
            const cx = e.clientX - rect.left;
            const cy = e.clientY - rect.top;

            this.panX = cx - (cx - this.panX) * (newScale / this.scale);
            this.panY = cy - (cy - this.panY) * (newScale / this.scale);
            this.scale = newScale;
            this.updateTransform();
        }, { passive: false });

        // Zoom buttons
        document.getElementById('btn-zoom-in').addEventListener('click', () => this.zoom(1.2));
        document.getElementById('btn-zoom-out').addEventListener('click', () => this.zoom(0.8));
        document.getElementById('btn-fit').addEventListener('click', () => this.fitToView());

        // Actions
        document.getElementById('btn-export').addEventListener('click', () => this.exportJSON());
        document.getElementById('btn-reset').addEventListener('click', () => this.resetChart());

        // Node events (delegated)
        this.chartEl.addEventListener('click', (e) => {
            const actionBtn = e.target.closest('.node-action-btn');
            if (actionBtn) {
                e.stopPropagation();
                const id = actionBtn.dataset.id;
                const action = actionBtn.dataset.action;
                if (action === 'add-child') this.addChild(id);
                if (action === 'delete') this.deleteNode(id);
                return;
            }

            const collapseBtn = e.target.closest('.collapse-toggle');
            if (collapseBtn) {
                e.stopPropagation();
                this.toggleCollapse(collapseBtn.dataset.id);
                return;
            }

            const card = e.target.closest('.node-card');
            if (card) {
                e.stopPropagation();
                this.openEdit(card.dataset.id);
                return;
            }
        });

        // Right click context menu
        this.chartEl.addEventListener('contextmenu', (e) => {
            const card = e.target.closest('.node-card');
            if (card) {
                e.preventDefault();
                this.showContextMenu(e.clientX, e.clientY, card.dataset.id);
            }
        });

        // Close context menu
        document.addEventListener('click', () => this.hideContextMenu());

        // Context menu actions
        this.contextMenu.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            const action = btn.dataset.action;
            const id = this.contextMenu.dataset.nodeId;
            this.hideContextMenu();

            switch (action) {
                case 'edit': this.openEdit(id); break;
                case 'add-child': this.addChild(id); break;
                case 'add-sibling': this.addSibling(id); break;
                case 'delete': this.deleteNode(id); break;
            }
        });

        // Edit modal
        document.getElementById('edit-cancel').addEventListener('click', () => this.closeEdit());
        document.getElementById('edit-save').addEventListener('click', () => this.saveEdit());
        this.editModal.querySelector('.modal-backdrop').addEventListener('click', () => this.closeEdit());

        // Enter to save
        this.editModal.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.saveEdit();
            if (e.key === 'Escape') this.closeEdit();
        });

        // Drag & Drop
        this.chartEl.addEventListener('dragstart', (e) => {
            const card = e.target.closest('.node-card');
            if (!card) return;
            const id = card.dataset.id;
            if (id === this.data.id) { e.preventDefault(); return; }

            this.dragNode = id;
            card.classList.add('dragging');

            // Custom ghost
            e.dataTransfer.setDragImage(new Image(), 0, 0);
            this.dragGhost = card.cloneNode(true);
            this.dragGhost.classList.add('drag-ghost');
            this.dragGhost.classList.remove('dragging');
            document.body.appendChild(this.dragGhost);
        });

        this.chartEl.addEventListener('dragover', (e) => {
            e.preventDefault();
            const card = e.target.closest('.node-card');
            if (card && card.dataset.id !== this.dragNode) {
                card.classList.add('drag-over');
            }
        });

        this.chartEl.addEventListener('dragleave', (e) => {
            const card = e.target.closest('.node-card');
            if (card) card.classList.remove('drag-over');
        });

        this.chartEl.addEventListener('drop', (e) => {
            e.preventDefault();
            const card = e.target.closest('.node-card');
            if (!card || !this.dragNode) return;
            const targetId = card.dataset.id;
            if (targetId === this.dragNode) return;

            // Check: can't drop onto own descendant
            if (this.isDescendant(this.dragNode, targetId)) {
                this.showToast('Cannot move a node into its own subtree');
                return;
            }

            // Move node
            const dragNodeObj = this.findNode(this.dragNode);
            const copy = JSON.parse(JSON.stringify(dragNodeObj));
            this.removeNode(this.dragNode);
            const target = this.findNode(targetId);
            if (!target.children) target.children = [];
            target.children.push(copy);

            this.render();
            this.showToast('Node moved successfully');
        });

        this.chartEl.addEventListener('dragend', () => {
            if (this.dragGhost) {
                this.dragGhost.remove();
                this.dragGhost = null;
            }
            document.querySelectorAll('.dragging, .drag-over').forEach(el => {
                el.classList.remove('dragging', 'drag-over');
            });
            this.dragNode = null;
        });

        // Keyboard
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideContextMenu();
                this.closeEdit();
            }
        });
    }

    /* ---- Pan & Zoom ---- */
    updateTransform() {
        this.canvas.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`;
    }

    zoom(factor) {
        const rect = this.canvasWrapper.getBoundingClientRect();
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const newScale = Math.max(0.2, Math.min(3, this.scale * factor));
        this.panX = cx - (cx - this.panX) * (newScale / this.scale);
        this.panY = cy - (cy - this.panY) * (newScale / this.scale);
        this.scale = newScale;
        this.updateTransform();
    }

    fitToView() {
        const wrapper = this.canvasWrapper.getBoundingClientRect();
        const chartW = parseInt(this.chartEl.style.width) || 1000;
        const chartH = parseInt(this.chartEl.style.height) || 800;

        const scaleX = (wrapper.width - 80) / chartW;
        const scaleY = (wrapper.height - 80) / chartH;
        this.scale = Math.min(scaleX, scaleY, 1.2);

        this.panX = (wrapper.width - chartW * this.scale) / 2;
        this.panY = 40;
        this.updateTransform();
    }

    /* ---- Node Operations ---- */
    addChild(parentId) {
        const parent = this.findNode(parentId);
        if (!parent) return;
        if (!parent.children) parent.children = [];

        const newNode = {
            id: this.generateId(),
            name: 'New Person',
            title: 'Role',
            children: []
        };
        parent.children.push(newNode);

        // Expand parent if collapsed
        this.collapsedNodes.delete(parentId);
        this.render();
        this.openEdit(newNode.id);
        this.showToast('Child node added');
    }

    addSibling(nodeId) {
        if (nodeId === this.data.id) return;
        const parent = this.findParent(nodeId);
        if (!parent) return;

        const newNode = {
            id: this.generateId(),
            name: 'New Person',
            title: 'Role',
            children: []
        };
        const idx = parent.children.findIndex(c => c.id === nodeId);
        parent.children.splice(idx + 1, 0, newNode);

        this.render();
        this.openEdit(newNode.id);
        this.showToast('Sibling node added');
    }

    deleteNode(nodeId) {
        if (nodeId === this.data.id) return;
        const node = this.findNode(nodeId);
        const childCount = this.countDescendants(node);
        const msg = childCount > 0
            ? `Delete "${node.name}" and ${childCount} descendant(s)?`
            : `Delete "${node.name}"?`;

        if (!confirm(msg)) return;

        this.removeNode(nodeId);
        this.selectedNodeId = null;
        this.render();
        this.showToast('Node deleted');
    }

    toggleCollapse(nodeId) {
        if (this.collapsedNodes.has(nodeId)) {
            this.collapsedNodes.delete(nodeId);
        } else {
            this.collapsedNodes.add(nodeId);
        }
        this.render();
    }

    /* ---- Edit Modal ---- */
    openEdit(nodeId) {
        const node = this.findNode(nodeId);
        if (!node) return;
        this.selectedNodeId = nodeId;

        document.getElementById('edit-name').value = node.name;
        document.getElementById('edit-title').value = node.title || '';
        this.editModal.classList.remove('hidden');
        this.editModal.dataset.nodeId = nodeId;

        setTimeout(() => document.getElementById('edit-name').focus(), 100);
    }

    closeEdit() {
        this.editModal.classList.add('hidden');
        this.selectedNodeId = null;
        this.render();
    }

    saveEdit() {
        const nodeId = this.editModal.dataset.nodeId;
        const node = this.findNode(nodeId);
        if (!node) return;

        node.name = document.getElementById('edit-name').value.trim() || 'Unnamed';
        node.title = document.getElementById('edit-title').value.trim();

        this.closeEdit();
        this.showToast('Node updated');
    }

    /* ---- Context Menu ---- */
    showContextMenu(x, y, nodeId) {
        this.contextMenu.classList.remove('hidden');
        this.contextMenu.dataset.nodeId = nodeId;

        // Hide delete for root
        const deleteBtn = this.contextMenu.querySelector('[data-action="delete"]');
        const siblingBtn = this.contextMenu.querySelector('[data-action="add-sibling"]');
        const hr = this.contextMenu.querySelector('hr');
        if (nodeId === this.data.id) {
            deleteBtn.style.display = 'none';
            siblingBtn.style.display = 'none';
            hr.style.display = 'none';
        } else {
            deleteBtn.style.display = 'flex';
            siblingBtn.style.display = 'flex';
            hr.style.display = 'block';
        }

        // Position
        const w = this.contextMenu.offsetWidth;
        const h = this.contextMenu.offsetHeight;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        this.contextMenu.style.left = (x + w > vw ? x - w : x) + 'px';
        this.contextMenu.style.top = (y + h > vh ? y - h : y) + 'px';
    }

    hideContextMenu() {
        this.contextMenu.classList.add('hidden');
    }

    /* ---- Export / Reset ---- */
    exportJSON() {
        const json = JSON.stringify(this.data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'orgchart.json';
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('Chart exported as JSON');
    }

    resetChart() {
        if (!confirm('Reset the chart to the original structure? All edits will be lost.')) return;
        localStorage.removeItem('orgchart_data');
        localStorage.removeItem('orgchart_collapsed');
        this.data = JSON.parse(JSON.stringify(DEFAULT_DATA));
        this.collapsedNodes.clear();
        this.selectedNodeId = null;
        this.render();
        this.fitToView();
        this.showToast('Chart reset to original');
    }

    /* ---- Helpers ---- */
    getInitials(name) {
        return name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2);
    }

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    isDescendant(ancestorId, nodeId, current = null) {
        if (!current) current = this.findNode(ancestorId);
        if (!current) return false;
        for (const child of (current.children || [])) {
            if (child.id === nodeId) return true;
            if (this.isDescendant(ancestorId, nodeId, child)) return true;
        }
        return false;
    }

    countDescendants(node) {
        if (!node.children) return 0;
        let count = node.children.length;
        node.children.forEach(c => count += this.countDescendants(c));
        return count;
    }

    showToast(message) {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
}

/* ---- Boot ---- */
document.addEventListener('DOMContentLoaded', () => {
    window.orgChart = new OrgChartApp();
});
