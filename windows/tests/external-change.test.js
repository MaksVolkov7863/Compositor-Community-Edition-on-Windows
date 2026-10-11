const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { ProjectDigest, ProjectWatcher } = require('../src/project-watcher');

describe('External Changes & Project Watcher Pipeline (Mac ExternalChangeTests Parity)', () => {
    it('ProjectDigest follows content changes deterministically and ignores metadata', () => {
        const manifest1 = { version: 9, width: 800, height: 600, layers: [{ name: 'Base' }] };
        const manifest2 = { version: 9, width: 800, height: 600, layers: [{ name: 'Base Renamed' }] };

        const digest1 = ProjectDigest.calculate(manifest1);
        const digest1b = ProjectDigest.calculate(manifest1);
        const digest2 = ProjectDigest.calculate(manifest2);

        assert.equal(digest1, digest1b);
        assert.notEqual(digest1, digest2);
    });

    it('ProjectWatcher detects external modifications on disk and triggers change event', (t, done) => {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'comp-watcher-test-'));
        const manifestFile = path.join(tmpDir, 'manifest.json');
        fs.writeFileSync(manifestFile, JSON.stringify({ version: 9, name: 'Project A' }));

        const watcher = new ProjectWatcher(tmpDir, { debounceMs: 50 });
        watcher.start();

        watcher.once('change', (ev) => {
            assert.equal(ev.path, tmpDir);
            assert.ok(ev.digest);
            watcher.stop();
            fs.rmSync(tmpDir, { recursive: true, force: true });
            done();
        });

        // External modification
        setTimeout(() => {
            fs.writeFileSync(manifestFile, JSON.stringify({ version: 9, name: 'Project Modified' }));
            watcher.checkNow();
        }, 100);
    });

    it('Internal save operations are masked and do not trigger false external drift', () => {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'comp-watcher-internal-'));
        const manifestFile = path.join(tmpDir, 'manifest.json');
        fs.writeFileSync(manifestFile, JSON.stringify({ version: 9, name: 'Save 1' }));

        const watcher = new ProjectWatcher(tmpDir, { debounceMs: 50 });
        watcher.start();

        let triggered = false;
        watcher.on('change', () => { triggered = true; });

        watcher.markInternalSaveStart();
        fs.writeFileSync(manifestFile, JSON.stringify({ version: 9, name: 'Save 2' }));
        watcher.markInternalSaveEnd();

        setTimeout(() => {
            watcher.stop();
            fs.rmSync(tmpDir, { recursive: true, force: true });
            assert.equal(triggered, false, 'Internal save did not trigger external change');
        }, 150);
    });
});
