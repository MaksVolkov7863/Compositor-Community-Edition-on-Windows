const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { ProjectWatcher } = require('./project-watcher');
// Decoders load on first use: libheif's WebAssembly is large and most sessions never need it.
const importers = () => require('./image-importer');

// Formats the renderer can't decode itself (Chromium handles PNG, JPEG, WebP, BMP, SVG)
const NODE_DECODED = ['.tif', '.tiff', '.heic', '.heif', '.psd', '.psb'];
const OPENABLE = ['comp', 'png', 'jpg', 'jpeg', 'webp', 'bmp', 'tif', 'tiff', 'heic', 'heif', 'psd', 'psb'];

let mainWindow = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 820,
        minWidth: 960,
        minHeight: 640,
        title: 'Compositor',
        backgroundColor: '#00000000',
        backgroundMaterial: 'mica',
        icon: path.join(__dirname, 'assets', 'icon.png'),
        frame: false,
        titleBarStyle: 'hidden',
        titleBarOverlay: {
            color: '#1a1a1a',
            symbolColor: '#e6e6e6',
            height: 36
        },
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    // Dropping a file on the window or clicking a stray link must not replace the editor UI.
    mainWindow.webContents.on('will-navigate', (event, url) => {
        if (url !== mainWindow.webContents.getURL()) event.preventDefault();
    });
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (/^https:\/\//.test(url)) shell.openExternal(url);
        return { action: 'deny' };
    });

    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    createApplicationMenu();
}

function sendAction(action, data = null) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('menu-action', action, data);
    }
}

function createApplicationMenu() {
    const template = [
        {
            label: '&File',
            submenu: [
                { label: 'New Canvas…', accelerator: 'Ctrl+N', click: () => sendAction('new-canvas') },
                { label: 'Open…', accelerator: 'Ctrl+O', click: () => sendAction('open-file') },
                { label: 'Import Image…', click: () => sendAction('import-image') },
                { type: 'separator' },
                { label: 'Save', accelerator: 'Ctrl+S', click: () => sendAction('save-project') },
                { label: 'Save As…', accelerator: 'Ctrl+Shift+S', click: () => sendAction('save-as-project') },
                { type: 'separator' },
                { label: 'Export PNG…', accelerator: 'Ctrl+Shift+E', click: () => sendAction('export-png') },
                { label: 'Export JPEG…', accelerator: 'Ctrl+Alt+Shift+S', click: () => sendAction('export-jpeg') },
                { label: 'Export TIFF…', click: () => sendAction('export-tiff') },
                { type: 'separator' },
                { label: 'Close Tab', accelerator: 'Ctrl+W', click: () => sendAction('close-tab') },
                { type: 'separator' },
                { label: 'Exit', accelerator: 'Alt+F4', click: () => app.quit() }
            ]
        },
        {
            label: '&Edit',
            submenu: [
                { label: 'Undo', accelerator: 'Ctrl+Z', click: () => sendAction('undo') },
                { label: 'Redo', accelerator: 'Ctrl+Shift+Z', click: () => sendAction('redo') },
                { type: 'separator' },
                { label: 'Cut', accelerator: 'Ctrl+X', click: () => sendAction('cut') },
                { label: 'Copy', accelerator: 'Ctrl+C', click: () => sendAction('copy') },
                { label: 'Copy Merged', accelerator: 'Ctrl+Shift+C', click: () => sendAction('copy-merged') },
                { label: 'Paste', accelerator: 'Ctrl+V', click: () => sendAction('paste') },
                { type: 'separator' },
                { label: 'Free Transform', accelerator: 'Ctrl+T', click: () => sendAction('free-transform') },
                { label: 'Fill Foreground Color', accelerator: 'Alt+Backspace', click: () => sendAction('fill-foreground') },
                { label: 'Fill Background Color', accelerator: 'Ctrl+Backspace', click: () => sendAction('fill-background') },
                { label: 'Content-Aware Fill…', accelerator: 'Shift+F5', click: () => sendAction('content-aware-fill') },
                { type: 'separator' },
                { label: 'Command Palette…', accelerator: 'Ctrl+F', click: () => sendAction('command-palette') },
                { label: 'Keyboard Shortcuts…', click: () => sendAction('keyboard-shortcuts') }
            ]
        },
        {
            label: '&Image',
            submenu: [
                { label: 'Levels…', accelerator: 'Ctrl+L', click: () => sendAction('filter-levels') },
                { label: 'Curves…', accelerator: 'Ctrl+M', click: () => sendAction('filter-curves') },
                { label: 'Hue/Saturation…', accelerator: 'Ctrl+U', click: () => sendAction('filter-huesat') },
                { label: 'Invert', accelerator: 'Ctrl+I', click: () => sendAction('filter-invert') },
                { type: 'separator' },
                { label: 'Canvas Size…', accelerator: 'Ctrl+Alt+C', click: () => sendAction('canvas-size') },
                { label: 'Image Size…', accelerator: 'Ctrl+Alt+I', click: () => sendAction('image-size') },
                { label: 'Trim…', click: () => sendAction('image-trim') },
                { type: 'separator' },
                { label: 'Flip Canvas Horizontal', click: () => sendAction('flip-canvas-h') },
                { label: 'Flip Canvas Vertical', click: () => sendAction('flip-canvas-v') }
            ]
        },
        {
            label: '&Layer',
            submenu: [
                { label: 'New Blank Layer', accelerator: 'Ctrl+Shift+N', click: () => sendAction('new-layer') },
                { label: 'Duplicate Layer', accelerator: 'Ctrl+J', click: () => sendAction('duplicate-layer') },
                { label: 'Delete Layer', accelerator: 'Delete', click: () => sendAction('delete-layer') },
                { type: 'separator' },
                { label: 'Create Clipping Mask', accelerator: 'Ctrl+Alt+G', click: () => sendAction('toggle-clipping-mask') },
                { label: 'Add Layer Mask', click: () => sendAction('add-layer-mask') },
                { type: 'separator' },
                { label: 'Group Layers', accelerator: 'Ctrl+G', click: () => sendAction('group-layers') },
                { label: 'Merge Layers', accelerator: 'Ctrl+E', click: () => sendAction('merge-layers') },
                { label: 'Flatten Image', click: () => sendAction('flatten-image') },
                { type: 'separator' },
                { label: 'Layer Effects…', click: () => sendAction('layer-effects') },
                { type: 'separator' },
                { label: 'Flip Layer Horizontal', click: () => sendAction('flip-layer-h') },
                { label: 'Flip Layer Vertical', click: () => sendAction('flip-layer-v') }
            ]
        },
        {
            label: '&Select',
            submenu: [
                { label: 'All', accelerator: 'Ctrl+A', click: () => sendAction('select-all') },
                { label: 'Deselect', accelerator: 'Ctrl+D', click: () => sendAction('deselect') },
                { label: 'Inverse Selection', accelerator: 'Ctrl+Shift+I', click: () => sendAction('invert-selection') },
                { label: 'Subject', accelerator: 'Ctrl+Alt+A', click: () => sendAction('select-subject') },
                { type: 'separator' },
                { label: 'Feather…', click: () => sendAction('select-feather') },
                { label: 'Expand…', click: () => sendAction('select-expand') },
                { label: 'Contract…', click: () => sendAction('select-contract') }
            ]
        },
        {
            label: '&Filter',
            submenu: [
                { label: 'Camera Raw Filter…', accelerator: 'Ctrl+Shift+A', click: () => sendAction('filter-camera-raw') },
                { type: 'separator' },
                { label: 'Gaussian Blur…', click: () => sendAction('filter-gaussian-blur') },
                { label: 'Motion Blur…', click: () => sendAction('filter-motion-blur') },
                { label: 'Add Noise…', click: () => sendAction('filter-add-noise') },
                { label: 'Film Grain…', click: () => sendAction('filter-film-grain') },
                { type: 'separator' },
                { label: 'Exposure…', click: () => sendAction('filter-exposure') },
                { label: 'Gradient Map…', click: () => sendAction('filter-gradient-map') },
                { type: 'separator' },
                { label: 'Remove Background', click: () => sendAction('remove-background') }
            ]
        },
        {
            label: '&View',
            submenu: [
                { label: 'Fit Canvas', accelerator: 'Ctrl+0', click: () => sendAction('zoom-fit') },
                { label: 'Actual Pixels (100%)', accelerator: 'Ctrl+1', click: () => sendAction('zoom-100') },
                { label: 'Zoom In', accelerator: 'Ctrl+=', click: () => sendAction('zoom-in') },
                { label: 'Zoom Out', accelerator: 'Ctrl+-', click: () => sendAction('zoom-out') },
                { type: 'separator' },
                { id: 'rulers', label: 'Rulers', accelerator: 'Ctrl+R', type: 'checkbox', checked: true, click: (item) => sendAction('toggle-rulers', item.checked) },
                { id: 'guides', label: 'Guides', accelerator: 'Ctrl+;', type: 'checkbox', checked: true, click: (item) => sendAction('toggle-guides', item.checked) },
                { id: 'grid', label: 'Show Grid', accelerator: 'Ctrl+\'', type: 'checkbox', checked: false, click: (item) => sendAction('toggle-grid', item.checked) },
                { label: 'Grid Settings…', click: () => sendAction('grid-settings') },
                { type: 'separator' },
                { id: 'snap', label: 'Snap', accelerator: 'Ctrl+Shift+;', type: 'checkbox', checked: true, click: (item) => sendAction('toggle-snap', item.checked) },
                { id: 'snapGrid', label: 'Snap To Grid', type: 'checkbox', checked: false, click: (item) => sendAction('toggle-snap-grid', item.checked) },
                { type: 'separator' },
                { label: 'Navigator', click: () => sendAction('toggle-navigator') },
                { label: 'Clear Guides', click: () => sendAction('clear-guides') }
            ]
        },
        {
            label: '&Help',
            submenu: [
                { label: 'About Compositor', click: () => sendAction('about') },
                { label: 'GitHub Repository', click: () => {
                    shell.openExternal('https://github.com/MaksVolkov7863/Compositor-Community-Edition-on-Windows');
                }}
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// Window controls IPC
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize();
    else mainWindow?.maximize();
});
ipcMain.on('window-close', () => mainWindow?.close());

// Dialog IPC
ipcMain.handle('dialog-open-file', async (event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, {
        title: options?.title || 'Open File',
        filters: options?.filters || [
            { name: 'All Supported Files', extensions: OPENABLE },
            { name: 'Compositor Projects (*.comp)', extensions: ['comp'] },
            { name: 'Images (PNG, JPEG, WebP, TIFF, HEIC, PSD)', extensions: OPENABLE.filter(e => e !== 'comp') }
        ],
        properties: ['openFile']
    });
    return result;
});

ipcMain.handle('dialog-save-file', async (event, options) => {
    const result = await dialog.showSaveDialog(mainWindow, {
        title: options?.title || 'Save File',
        defaultPath: options?.defaultPath || 'Untitled.comp',
        filters: options?.filters || [
            { name: 'Compositor Project (*.comp)', extensions: ['comp'] },
            { name: 'PNG Image (*.png)', extensions: ['png'] },
            { name: 'JPEG Image (*.jpg)', extensions: ['jpg', 'jpeg'] }
        ]
    });
    return result;
});

ipcMain.handle('fs-read-file', async (event, filePath) => {
    try {
        const buffer = await fs.promises.readFile(filePath);
        return { success: true, data: buffer.toString('base64'), path: filePath };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('fs-write-file', async (event, filePath, data) => {
    const ownSave = projectWatcher && projectWatcher.projectPath === filePath;
    try {
        if (ownSave) projectWatcher.markInternalSaveStart();
        const buffer = Buffer.from(data, 'base64');
        await fs.promises.writeFile(filePath, buffer);
        return { success: true, path: filePath };
    } catch (err) {
        return { success: false, error: err.message };
    } finally {
        if (ownSave) projectWatcher.markInternalSaveEnd();
    }
});

// TIFF, HEIC/HEIF and PSD/PSB are decoded here with the bundled UTIF, libheif-js and PSD reader.
ipcMain.handle('image-decode', async (event, filePath) => {
    try {
        const ext = path.extname(filePath).toLowerCase();
        if (!NODE_DECODED.includes(ext)) return { success: false, error: 'unsupported' };
        const image = await importers().ImageImporter.shared.decode(filePath);
        const data = Buffer.from(image.data.buffer, image.data.byteOffset, image.data.byteLength);
        return { success: true, width: image.width, height: image.height, name: image.name, format: image.format, data };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('image-export-tiff', async (event, { width, height, rgba, defaultPath }) => {
    try {
        const result = await dialog.showSaveDialog(mainWindow, {
            title: 'Export TIFF',
            defaultPath: defaultPath || 'Compositor_Export.tif',
            filters: [{ name: 'TIFF Image (*.tif, *.tiff)', extensions: ['tif', 'tiff'] }]
        });
        if (result.canceled || !result.filePath) return { success: false, canceled: true };
        const buffer = importers().encodeTIFF(new Uint8Array(rgba), width, height);
        await fs.promises.writeFile(result.filePath, buffer);
        return { success: true, path: result.filePath };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

// Reloading a project changed by another app (or an agent writing the .comp) while it's open.
let projectWatcher = null;
ipcMain.on('project-watch', (event, filePath) => {
    if (projectWatcher && projectWatcher.projectPath === filePath) return;
    if (projectWatcher) projectWatcher.stop();
    projectWatcher = null;
    if (!filePath || !fs.existsSync(filePath)) return;
    projectWatcher = new ProjectWatcher(filePath);
    projectWatcher.on('change', ({ path: changedPath }) => {
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('project-changed', changedPath);
    });
    projectWatcher.start();
});

// Keeps View menu checkmarks in step with the page (hotkeys and panel buttons toggle them too).
ipcMain.on('menu-state', (event, state) => {
    const menu = Menu.getApplicationMenu();
    if (!menu || !state) return;
    for (const [id, checked] of Object.entries(state)) {
        const item = menu.getMenuItemById(id);
        if (item && typeof checked === 'boolean') item.checked = checked;
    }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
