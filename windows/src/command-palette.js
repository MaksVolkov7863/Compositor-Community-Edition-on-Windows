/**
 * CommandPalette - Search and run commands, menu items, filters, and tools
 * 
 * Matches Swift CommandPalette & CommandPaletteSearch (Compositor/UI/CommandPalette.swift)
 */

class CommandPaletteEntry {
    constructor(id, options = {}) {
        this.id = id;
        this.title = options.title || id;
        this.shortcut = options.shortcut || null;
        this.isEnabled = options.isEnabled !== undefined ? options.isEnabled : (options.enabled !== false);
        this.perform = options.perform || (() => {});
        this.category = options.category || '';
    }
}

class CommandPaletteSearch {
    /**
     * Scores a search query against a target string.
     * Letters must appear in order. Matching word starts receives a bonus.
     * Returns null if no match.
     */
    static score(query, target) {
        if (!query || query.length === 0) return 0;
        const q = query.toLowerCase();
        const t = target.toLowerCase();

        // Exact match gets highest score
        if (t === q) return 1000;
        if (t.startsWith(q)) return 800 - t.length;

        // Check if any word in target matches query exactly or starts with query
        const queryWords = q.split(/\s+/).filter(Boolean);
        const targetWords = t.split(/[\s›,.\-—–/…]+/).filter(Boolean);

        if (targetWords.some(tw => tw === q)) {
            return 700 - t.length;
        }
        if (targetWords.some(tw => tw.startsWith(q))) {
            return 600 - t.length;
        }

        if (queryWords.length > 1) {
            let allMatch = true;
            let totalScore = 400;
            for (const qw of queryWords) {
                const matchIndex = targetWords.findIndex(tw => tw.startsWith(qw));
                if (matchIndex === -1) {
                    allMatch = false;
                    break;
                }
                totalScore += 50 - matchIndex * 5;
            }
            if (allMatch) return totalScore - target.length;
        }

        let qIdx = 0;
        let score = 100;
        let lastMatchIdx = -1;
        let consecutive = 0;

        for (let i = 0; i < t.length && qIdx < q.length; i++) {
            if (t[i] === q[qIdx]) {
                const isWordStart = i === 0 || /[\s›,.\-—–/…]/.test(t[i - 1]);
                if (isWordStart) {
                    score += 40;
                }
                if (lastMatchIdx === i - 1) {
                    consecutive++;
                    score += consecutive * 10;
                } else {
                    consecutive = 0;
                }
                lastMatchIdx = i;
                qIdx++;
            }
        }

        if (qIdx < q.length) {
            return null; // Letters did not appear in order
        }

        return score - target.length;
    }

    /**
     * Ranks entries by search query.
     * Returns entries sorted with highest score first and enabled entries prioritized.
     */
    static rank(entries, query = '') {
        if (!query || query.trim().length === 0) {
            // No query: return everything, enabled first, original menu order preserved
            const enabled = entries.filter(e => e.isEnabled);
            const disabled = entries.filter(e => !e.isEnabled);
            return [...enabled, ...disabled];
        }

        const trimmed = query.trim();
        const scored = [];

        for (const entry of entries) {
            const label = entry.id || entry.title;
            const score = this.score(trimmed, label);
            if (score !== null) {
                scored.push({ entry, score });
            }
        }

        scored.sort((a, b) => {
            // Enabled comes before disabled
            if (a.entry.isEnabled !== b.entry.isEnabled) {
                return a.entry.isEnabled ? -1 : 1;
            }
            // Higher score first
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            // Shorter title first
            return a.entry.id.length - b.entry.id.length;
        });

        return scored.map(s => s.entry);
    }
}

class CommandPaletteModel {
    constructor(entries = []) {
        this.entries = entries.map(e => e instanceof CommandPaletteEntry ? e : new CommandPaletteEntry(e.id || e, e));
        this._query = '';
        this.filtered = [...this.entries];
        this.selectedIndex = 0;
    }

    get query() {
        return this._query;
    }

    set query(val) {
        this._query = val || '';
        this.filtered = CommandPaletteSearch.rank(this.entries, this._query);
        if (this.selectedIndex >= this.filtered.length) {
            this.selectedIndex = Math.max(0, this.filtered.length - 1);
        }
    }

    get selected() {
        return this.filtered[this.selectedIndex] || null;
    }

    move(delta) {
        if (this.filtered.length === 0) return;
        this.selectedIndex = (this.selectedIndex + delta + this.filtered.length) % this.filtered.length;
    }

    executeSelected() {
        const item = this.selected;
        if (item && item.isEnabled && typeof item.perform === 'function') {
            item.perform();
            return true;
        }
        return false;
    }
}

if (typeof module !== 'undefined') {
    module.exports = {
        CommandPaletteEntry,
        CommandPaletteSearch,
        CommandPaletteModel
    };
}
