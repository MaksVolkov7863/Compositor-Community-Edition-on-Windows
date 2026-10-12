const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { ProjectWatcher, ProjectDigest } = require('../src/project-watcher');

describe('Project watcher on a single .comp file (Windows saves one zip)', () => {
    it('digests a file by its contents', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'comp-'));
        const file = path.join(dir, 'a.comp');
        fs.writeFileSync(file, 'one');
        const d1 = ProjectDigest.fromPath(file);
        fs.writeFileSync(file, 'two');
        assert.notEqual(ProjectDigest.fromPath(file), d1);
        fs.rmSync(dir, { recursive: true });
    });

    it('reports an outside change but not its own save', async () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'comp-'));
        const file = path.join(dir, 'a.comp');
        fs.writeFileSync(file, 'one');
        const watcher = new ProjectWatcher(file, { debounceMs: 20, pollMs: 50 });
        let changes = 0;
        watcher.on('change', () => changes++);
        watcher.start();
        watcher.markInternalSaveStart();
        fs.writeFileSync(file, 'saved by us');
        watcher.markInternalSaveEnd();
        await new Promise(r => setTimeout(r, 400));
        assert.equal(changes, 0);
        fs.writeFileSync(file, 'changed by someone else');
        await new Promise(r => setTimeout(r, 400));
        watcher.stop();
        assert.equal(changes, 1);
        fs.rmSync(dir, { recursive: true });
    });
});
