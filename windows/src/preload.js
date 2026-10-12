const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Window controls
    minimizeWindow: () => ipcRenderer.send('window-minimize'),
    maximizeWindow: () => ipcRenderer.send('window-maximize'),
    closeWindow: () => ipcRenderer.send('window-close'),
    
    // File dialogs
    openFileDialog: (options) => ipcRenderer.invoke('dialog-open-file', options),
    saveFileDialog: (options) => ipcRenderer.invoke('dialog-save-file', options),
    
    // File system
    readFile: (filePath) => ipcRenderer.invoke('fs-read-file', filePath),
    writeFile: (filePath, data) => ipcRenderer.invoke('fs-write-file', filePath, data),
    
    // Images Chromium can't decode (TIFF, HEIC, PSD) and TIFF export
    decodeImage: (filePath) => ipcRenderer.invoke('image-decode', filePath),
    exportTIFF: (options) => ipcRenderer.invoke('image-export-tiff', options),

    // Project file watching and native menu state
    watchProject: (filePath) => ipcRenderer.send('project-watch', filePath || null),
    onProjectChanged: (callback) => {
        ipcRenderer.on('project-changed', (event, filePath) => callback(filePath));
    },
    setMenuState: (state) => ipcRenderer.send('menu-state', state),

    // Menu events
    onMenuAction: (callback) => {
        ipcRenderer.on('menu-action', (event, action, data) => callback(action, data));
    }
});
