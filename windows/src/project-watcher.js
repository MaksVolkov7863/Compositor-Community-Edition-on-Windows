/**
 * ProjectWatcher & ProjectDigest - External filesystem change tracking for .comp packages
 * 
 * Matches Swift ProjectWatcher & ProjectDigest (Compositor/IO/ProjectWatcher.swift & ProjectDigest.swift)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const EventEmitter = require('events');

class ProjectDigest {
    /**
     * Calculates deterministic hash digest from project manifest and layer metadata
     * @param {Object|string} manifestObj Manifest object or JSON string
     * @param {Array<Object>} [images] Optional array of image metadata
     */
    static calculate(manifestObj, images = []) {
        const hash = crypto.createHash('sha256');
        const manifestStr = typeof manifestObj === 'string' ? manifestObj : JSON.stringify(manifestObj);
        hash.update(manifestStr);

        for (const img of images) {
            hash.update(String(img.name || img.id || ''));
            hash.update(String(img.size || img.length || 0));
        }

        return hash.digest('hex');
    }

    /**
     * Digest of a project on disk: a .comp package directory, or a single .comp file
     * (the Windows edition saves projects as one zip file).
     */
    static fromPath(projectPath) {
        if (!projectPath || !fs.existsSync(projectPath)) return null;
        const stat = fs.statSync(projectPath);
        if (stat.isDirectory()) return ProjectDigest.fromDirectory(projectPath);
        return crypto.createHash('sha256').update(fs.readFileSync(projectPath)).digest('hex');
    }

    /**
     * Computes digest directly from a saved .comp directory on disk
     */
    static fromDirectory(dirPath) {
        if (!fs.existsSync(dirPath)) return null;
        const manifestPath = path.join(dirPath, 'manifest.json');
        if (!fs.existsSync(manifestPath)) return null;

        const manifestContent = fs.readFileSync(manifestPath, 'utf8');
        const imagesDir = path.join(dirPath, 'images');
        const imagesMeta = [];

        if (fs.existsSync(imagesDir)) {
            const files = fs.readdirSync(imagesDir);
            for (const f of files.sort()) {
                const stat = fs.statSync(path.join(imagesDir, f));
                imagesMeta.push({ name: f, size: stat.size });
            }
        }

        return ProjectDigest.calculate(manifestContent, imagesMeta);
    }
}

class ProjectWatcher extends EventEmitter {
    constructor(projectPath, options = {}) {
        super();
        this.projectPath = projectPath;
        this.currentDigest = options.initialDigest || null;
        this.debounceMs = options.debounceMs || 200;
        this.pollMs = options.pollMs || 500;
        this.isWatching = false;
        this._fsWatcher = null;
        this._debounceTimer = null;
        this._isSaving = false;
    }

    start() {
        if (this.isWatching || !this.projectPath || !fs.existsSync(this.projectPath)) return;
        this.isWatching = true;

        if (!this.currentDigest) {
            this.currentDigest = ProjectDigest.fromPath(this.projectPath);
        }

        try {
            if (fs.statSync(this.projectPath).isDirectory()) {
                this._fsWatcher = fs.watch(this.projectPath, { recursive: true }, () => {
                    if (this._isSaving) return;
                    this._onFsEvent();
                });
            } else {
                // A single file: poll its stat, which also survives editors that save by
                // writing a new file and renaming it over the old one.
                this._fileListener = () => {
                    if (this._isSaving) return;
                    this._onFsEvent();
                };
                fs.watchFile(this.projectPath, { interval: this.pollMs || 500 }, this._fileListener);
            }
        } catch (e) {
            // Fallback: non-recursive watch or ignore if unsupportable
        }
    }

    stop() {
        if (!this.isWatching) return;
        this.isWatching = false;
        if (this._debounceTimer) clearTimeout(this._debounceTimer);
        if (this._fsWatcher) {
            try { this._fsWatcher.close(); } catch (e) {}
            this._fsWatcher = null;
        }
        if (this._fileListener) {
            fs.unwatchFile(this.projectPath, this._fileListener);
            this._fileListener = null;
        }
    }

    markInternalSaveStart() {
        this._isSaving = true;
    }

    markInternalSaveEnd() {
        this.currentDigest = ProjectDigest.fromPath(this.projectPath);
        setTimeout(() => {
            this._isSaving = false;
        }, 100);
    }

    _onFsEvent() {
        if (this._debounceTimer) clearTimeout(this._debounceTimer);
        this._debounceTimer = setTimeout(() => {
            this.checkNow();
        }, this.debounceMs);
    }

    checkNow() {
        if (!fs.existsSync(this.projectPath)) return false;
        const newDigest = ProjectDigest.fromPath(this.projectPath);
        if (!newDigest) return false;

        if (this.currentDigest && newDigest !== this.currentDigest) {
            this.currentDigest = newDigest;
            this.emit('change', { path: this.projectPath, digest: newDigest });
            return true;
        } else if (!this.currentDigest) {
            this.currentDigest = newDigest;
        }
        return false;
    }
}

if (typeof module !== 'undefined') {
    module.exports = {
        ProjectDigest,
        ProjectWatcher
    };
}
