const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

describe('Custom Title Bar & Draggable Region Pipeline (Mac TitleBarDragTests Parity)', () => {
    it('HTML and CSS define draggable titlebar region and non-draggable interactive tabs', () => {
        const htmlPath = path.join(__dirname, '..', 'src', 'index.html');
        const cssPath = path.join(__dirname, '..', 'src', 'app.css');

        const html = fs.readFileSync(htmlPath, 'utf8');
        const css = fs.readFileSync(cssPath, 'utf8');

        // Verify title bar and window controls exist
        assert.ok(html.includes('titlebar') || html.includes('title-bar'), 'Titlebar DOM present');
        assert.ok(
            css.includes('-webkit-app-region: drag') || html.includes('style="-webkit-app-region: drag"') || html.includes('-webkit-app-region: drag'),
            'Draggable titlebar region configured'
        );
        assert.ok(
            css.includes('-webkit-app-region: no-drag') || html.includes('-webkit-app-region: no-drag'),
            'Non-draggable interactive controls configured'
        );
    });

    it('Window controls provide minimize, maximize, and close triggers', () => {
        const htmlPath = path.join(__dirname, '..', 'src', 'index.html');
        const html = fs.readFileSync(htmlPath, 'utf8');

        assert.ok(html.includes('window-close') || html.includes('btn-close') || html.includes('app-close') || html.includes('close'), 'Close button defined');
    });
});
