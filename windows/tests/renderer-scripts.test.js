const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// The Electron renderer runs with contextIsolation and without nodeIntegration, so the
// scripts index.html loads must work without require/module. These tests load them the
// way the window does, in a bare context, so a stray require() fails here, not on launch.

const srcDir = path.join(__dirname, '..', 'src');
const html = fs.readFileSync(path.join(srcDir, 'index.html'), 'utf8');
const scriptSrcs = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
const inlineScript = html.slice(html.lastIndexOf('<script>') + '<script>'.length, html.lastIndexOf('</script>'));

describe('Renderer scripts load without Node integration', () => {
    it('every <script src> is a local file that exists (no CDN, works offline)', () => {
        assert.ok(scriptSrcs.length > 0);
        for (const src of scriptSrcs) {
            assert.ok(!/^https?:/i.test(src), `remote script ${src}`);
            assert.ok(fs.existsSync(path.join(srcDir, src)), `missing ${src}`);
        }
    });

    it('engine.js and project-store.js evaluate in a context without require and define the engine', () => {
        const context = vm.createContext({ console, setTimeout, clearTimeout });
        for (const src of scriptSrcs) {
            const code = fs.readFileSync(path.join(srcDir, src), 'utf8');
            vm.runInContext(code, context, { filename: src });
        }
        const result = vm.runInContext(`(() => {
            const eng = CompositorEngine.createHeadless(64, 48);
            eng.addLayer('Probe');
            return { engine: typeof CompositorEngine, store: typeof ProjectStore, zip: typeof JSZip, layers: eng.layers.length };
        })()`, context);
        assert.deepEqual(JSON.parse(JSON.stringify(result)), { engine: 'function', store: 'function', zip: 'function', layers: 2 });
    });

    it('the inline UI script is valid JavaScript', () => {
        assert.doesNotThrow(() => new vm.Script(inlineScript, { filename: 'index.html' }));
    });

    it('every menu action has a handler and every dialog it opens exists', () => {
        const mainJs = fs.readFileSync(path.join(srcDir, 'main.js'), 'utf8');
        const actions = new Set([
            ...[...html.matchAll(/triggerAction\('([\w-]+)'/g)].map(m => m[1]),
            ...[...mainJs.matchAll(/sendAction\('([\w-]+)'/g)].map(m => m[1])
        ]);
        const dispatcher = inlineScript.slice(inlineScript.indexOf('function triggerAction'), inlineScript.indexOf('// Render Histogram'));
        const handled = new Set([...dispatcher.matchAll(/case '([\w-]+)':/g)].map(m => m[1]));
        const unhandled = [...actions].filter(a => !handled.has(a));
        assert.deepEqual(unhandled, []);

        const ids = new Set([...html.matchAll(/id="([\w-]+)"/g)].map(m => m[1]));
        const modals = [...html.matchAll(/(?:openModal|openSizeModal|closeModal)\('([\w-]+)'\)/g)].map(m => m[1]);
        assert.deepEqual(modals.filter(id => !ids.has(id)), []);
    });

    it('every engine method the UI calls exists', () => {
        const CompositorEngine = require('../src/engine.js');
        const called = new Set([...inlineScript.matchAll(/engine\.(\w+)\(/g)].map(m => m[1]));
        const missing = [...called].filter(name => typeof CompositorEngine.prototype[name] !== 'function');
        assert.deepEqual(missing, []);
    });
});
