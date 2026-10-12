/**
 * Command palette (Ctrl+F, as ⌘F on the Mac): every menu command, found by typing a few of its
 * letters in order. Up/Down choose, Enter runs, Escape closes. Ranking comes from
 * CommandPaletteSearch; the panel's position is kept on screen by FloatingPanelController.
 */
(function () {
    const panel = new FloatingPanelController('commandPalette', { title: 'Commands', width: 460, height: 360 });
    let model = null;
    let root = null, input = null, list = null;

    function el(id) { return document.getElementById(id); }

    // One entry per titlebar menu item, labelled "Menu › Command" with its shortcut.
    function entries() {
        const out = [];
        for (const menu of document.querySelectorAll('.menu-bar .menu-item')) {
            const menuName = menu.childNodes[0].textContent.trim();
            for (const item of menu.querySelectorAll('.dropdown-item')) {
                const match = (item.getAttribute('onclick') || '').match(/triggerAction\('([\w-]+)'/);
                if (!match || match[1] === 'command-palette') continue;
                const shortcut = item.querySelector('.shortcut');
                const title = [...item.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
                const action = match[1];
                out.push(new CommandPaletteEntry(action + ':' + title, {
                    title: `${menuName} › ${title}`,
                    shortcut: shortcut ? shortcut.textContent : null,
                    category: menuName,
                    isEnabled: !item.classList.contains('disabled'),
                    perform: () => triggerAction(action)
                }));
            }
        }
        return out;
    }

    function build() {
        if (root) return;
        root = document.createElement('div');
        root.id = 'commandPalette';
        root.className = 'modal-overlay';
        root.style.alignItems = 'flex-start';
        root.innerHTML = `
            <div class="modal-dialog" id="commandPaletteDialog" style="width:${panel.width}px;margin-top:80px">
                <div class="modal-content" style="gap:6px">
                    <input type="text" id="commandPaletteInput" class="form-control" placeholder="Search commands" autocomplete="off" spellcheck="false" style="width:100%">
                    <div id="commandPaletteList" style="max-height:${panel.height - 60}px;overflow-y:auto"></div>
                </div>
            </div>`;
        document.body.appendChild(root);
        input = el('commandPaletteInput');
        list = el('commandPaletteList');
        input.addEventListener('input', () => { model.query = input.value; model.selectedIndex = 0; render(); });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); model.move(1); render(); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); model.move(-1); render(); }
            else if (e.key === 'Enter') { e.preventDefault(); CommandPalette.runSelected(); }
            else if (e.key === 'Escape') { e.preventDefault(); CommandPalette.close(); }
        });
        root.addEventListener('mousedown', (e) => { if (e.target === root) CommandPalette.close(); });
    }

    function render() {
        list.innerHTML = '';
        if (model.filtered.length === 0) {
            list.innerHTML = '<div style="padding:8px;color:var(--text-muted)">No matching commands</div>';
            return;
        }
        model.filtered.forEach((entry, i) => {
            const row = document.createElement('div');
            row.className = 'dropdown-item' + (i === model.selectedIndex ? ' active' : '');
            row.style.cssText = 'display:flex;justify-content:space-between;padding:6px 8px;border-radius:4px;cursor:pointer;'
                + (i === model.selectedIndex ? 'background:var(--accent);color:#fff;' : '')
                + (entry.isEnabled ? '' : 'opacity:0.45;');
            row.textContent = entry.title;
            if (entry.shortcut) {
                const s = document.createElement('span');
                s.className = 'shortcut';
                s.textContent = entry.shortcut;
                row.appendChild(s);
            }
            row.addEventListener('mousemove', () => { if (model.selectedIndex !== i) { model.selectedIndex = i; render(); } });
            row.addEventListener('click', () => { model.selectedIndex = i; CommandPalette.runSelected(); });
            list.appendChild(row);
        });
        const active = list.children[model.selectedIndex];
        if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest' });
    }

    const CommandPalette = {
        get isOpen() { return panel.isVisible; },
        open() {
            build();
            model = new CommandPaletteModel(entries());
            panel.show(model);
            panel.moveTo((window.innerWidth - panel.width) / 2, 80, window.innerWidth, window.innerHeight);
            el('commandPaletteDialog').style.marginLeft = '0';
            root.classList.add('active');
            input.value = '';
            model.query = '';
            render();
            input.focus();
        },
        toggle() { if (panel.isVisible) CommandPalette.close(); else CommandPalette.open(); },
        close() {
            panel.close(false);
            if (root) root.classList.remove('active');
        },
        search(query) { if (!model) CommandPalette.open(); input.value = query; model.query = query; model.selectedIndex = 0; render(); return model.filtered.map(e => e.title); },
        runSelected() {
            const entry = model && model.selected;
            CommandPalette.close();
            if (entry && entry.isEnabled) entry.perform();
            return !!entry;
        }
    };
    window.CommandPalette = CommandPalette;
})();
