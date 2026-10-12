/**
 * Document tabs: several projects open at once, one engine. Switching tabs swaps the engine's
 * document state (layers, history, guides, selection, view) in and out. New Canvas and Open
 * add a tab; Ctrl+W closes one. When tabs don't fit, projectTabOverflow (the Mac's layout)
 * decides which show and the rest go in a "N more tabs" menu. Each tab remembers the file it
 * came from, so Save writes back there and the file is watched for outside changes.
 */
(function () {
    const STATE_KEYS = ['width', 'height', 'resolution', 'layers', 'activeLayerId', 'history', 'historyIndex',
        'guides', 'selection', 'selectionPath', 'transformBox', 'cropBox'];
    let tabs = [];
    let activeId = null;
    let nextId = 1;
    let untitled = 1;
    let bar = null;

    function el(id) { return document.getElementById(id); }

    function capture() {
        const state = {};
        for (const key of STATE_KEYS) state[key] = engine[key];
        state.viewport = { ...engine.viewport };
        return state;
    }

    function restore(state) {
        for (const key of STATE_KEYS) engine[key] = state[key];
        engine.viewport = { ...state.viewport };
        engine.canvas.width = engine.width;
        engine.canvas.height = engine.height;
        engine.overlay.width = engine.width;
        engine.overlay.height = engine.height;
        engine.render();
        engine.notifyUI();
        if (engine.onHistoryChange) engine.onHistoryChange(engine.history, engine.historyIndex);
        updateCanvasTransform();
    }

    function active() { return tabs.find(t => t.id === activeId) || null; }

    function build() {
        if (bar) return;
        bar = document.createElement('div');
        bar.id = 'documentTabs';
        bar.className = 'document-tabs';
        const workspace = document.querySelector('.main-workspace');
        workspace.parentNode.insertBefore(bar, workspace);
        window.addEventListener('resize', () => DocumentTabs.render());
    }

    function tabElement(tab) {
        const item = document.createElement('div');
        item.className = 'document-tab' + (tab.id === activeId ? ' active' : '');
        item.dataset.tabId = tab.id;
        item.title = tab.filePath || tab.title;
        item.onclick = () => DocumentTabs.select(tab.id);
        const label = document.createElement('span');
        label.textContent = tab.title;
        const close = document.createElement('button');
        close.className = 'document-tab-close';
        close.textContent = '×';
        close.title = 'Close Tab (Ctrl+W)';
        close.onclick = (e) => { e.stopPropagation(); DocumentTabs.close(tab.id); };
        item.appendChild(label);
        item.appendChild(close);
        return item;
    }

    const DocumentTabs = {
        get tabs() { return tabs.map(t => ({ id: t.id, title: t.title, filePath: t.filePath })); },
        get active() { const t = active(); return t ? { id: t.id, title: t.title, filePath: t.filePath } : null; },

        // Adopts the document already in the engine as the first tab.
        init() {
            build();
            tabs = [{ id: nextId++, title: `Untitled-${untitled++}`, filePath: null, state: null }];
            activeId = tabs[0].id;
            DocumentTabs.render();
        },

        // Opens a new tab and runs `setup` to fill the engine with its document.
        open(title, filePath, setup) {
            const current = active();
            if (current) current.state = capture();
            const tab = { id: nextId++, title: title || `Untitled-${untitled++}`, filePath: filePath || null, state: null };
            tabs.push(tab);
            activeId = tab.id;
            engine.history = [];
            engine.historyIndex = -1;
            engine.selection = null;
            engine.selectionPath = null;
            engine.guides = { horizontal: [], vertical: [] };
            setup();
            DocumentTabs.render();
            DocumentTabs.watchActive();
            return tab.id;
        },

        select(id) {
            if (id === activeId) return;
            const next = tabs.find(t => t.id === id);
            if (!next) return;
            const current = active();
            if (current) current.state = capture();
            activeId = id;
            restore(next.state);
            DocumentTabs.render();
            DocumentTabs.watchActive();
        },

        close(id = activeId) {
            const index = tabs.findIndex(t => t.id === id);
            if (index === -1) return;
            if (tabs.length === 1) {
                // The last tab stays: it becomes a fresh blank document, as on the Mac
                tabs[0] = { id: nextId++, title: `Untitled-${untitled++}`, filePath: null, state: null };
                activeId = tabs[0].id;
                engine.history = [];
                engine.historyIndex = -1;
                engine.selection = null;
                engine.selectionPath = null;
                engine.newCanvas(1200, 800, '#ffffff');
                engine.fitToScreen();
            } else {
                const wasActive = id === activeId;
                tabs.splice(index, 1);
                if (wasActive) {
                    const next = tabs[Math.min(index, tabs.length - 1)];
                    activeId = next.id;
                    restore(next.state);
                }
            }
            DocumentTabs.render();
            DocumentTabs.watchActive();
        },

        setFile(filePath, title) {
            const tab = active();
            if (!tab) return;
            tab.filePath = filePath;
            if (title) tab.title = title;
            DocumentTabs.render();
            DocumentTabs.watchActive();
        },

        watchActive() {
            const tab = active();
            if (window.electronAPI && window.electronAPI.watchProject) {
                window.electronAPI.watchProject(tab && tab.filePath && tab.filePath.toLowerCase().endsWith('.comp') ? tab.filePath : null);
            }
        },

        render() {
            build();
            bar.innerHTML = '';
            // Measure every tab, then let the Mac's overflow layout pick what fits
            const elements = {};
            const widths = {};
            for (const tab of tabs) {
                const item = tabElement(tab);
                item.style.visibility = 'hidden';
                bar.appendChild(item);
                elements[tab.id] = item;
                widths[tab.id] = Math.ceil(item.getBoundingClientRect().width) || 120;
            }
            const layout = projectTabOverflow({
                order: tabs.map(t => t.id), widths, selectedID: activeId,
                availableWidth: bar.clientWidth - 12, pillWidth: () => 92
            });
            bar.innerHTML = '';
            if (layout.pill) {
                const pill = document.createElement('div');
                pill.className = 'document-tab document-tab-overflow';
                pill.textContent = projectTabOverflowLabel(layout.hiddenIDs.length);
                pill.onclick = (e) => {
                    e.stopPropagation();
                    const menu = document.createElement('div');
                    menu.className = 'dropdown-menu document-tab-menu';
                    menu.style.display = 'block';
                    for (const id of layout.hiddenIDs) {
                        const tab = tabs.find(t => t.id === id);
                        const row = document.createElement('div');
                        row.className = 'dropdown-item';
                        row.textContent = tab.title;
                        row.onclick = () => { menu.remove(); DocumentTabs.select(id); };
                        menu.appendChild(row);
                    }
                    pill.appendChild(menu);
                    setTimeout(() => window.addEventListener('click', () => menu.remove(), { once: true }));
                };
                bar.appendChild(pill);
            }
            for (const v of layout.visible) {
                const item = elements[v.id];
                item.style.visibility = '';
                bar.appendChild(item);
            }
        }
    };
    window.DocumentTabs = DocumentTabs;
})();
