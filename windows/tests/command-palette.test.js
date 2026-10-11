const { describe, it } = require('node:test');
const assert = require('node:assert');
const { CommandPaletteEntry, CommandPaletteSearch, CommandPaletteModel } = require('../src/command-palette');

describe('Command Palette & Search Pipeline (Mac CommandPaletteTests Parity)', () => {
    it('Letters in order match and word starts count higher in score', () => {
        assert.notEqual(CommandPaletteSearch.score('gb', 'Filter › Gaussian Blur…'), null);
        assert.notEqual(CommandPaletteSearch.score('BLUR', 'Filter › Gaussian Blur…'), null);
        assert.equal(CommandPaletteSearch.score('bg', 'Filter › Gaussian Blur…'), null, 'Letters must come in order');
        assert.equal(CommandPaletteSearch.score('', 'Anything'), 0);

        const wordStarts = CommandPaletteSearch.score('gb', 'Filter › Gaussian Blur…');
        const midWord = CommandPaletteSearch.score('gb', 'Edit › Debug Tab');
        assert.ok(wordStarts > midWord, `Expected word start score (${wordStarts}) > midWord (${midWord})`);
    });

    it('Ranking puts best matches and enabled commands first', () => {
        const entries = [
            new CommandPaletteEntry('Edit › Paste', { enabled: true }),
            new CommandPaletteEntry('Layer › Flip Layer Horizontal', { enabled: true }),
            new CommandPaletteEntry('Filter › Gaussian Blur…', { enabled: true }),
            new CommandPaletteEntry('Filter › Motion Blur…', { enabled: true }),
            new CommandPaletteEntry('Edit › Undo', { enabled: false }),
            new CommandPaletteEntry('Image › Levels…', { enabled: true })
        ];

        const rankedGau = CommandPaletteSearch.rank(entries, 'gau');
        assert.equal(rankedGau[0].id, 'Filter › Gaussian Blur…');

        const rankedBlur = CommandPaletteSearch.rank(entries, 'blur').map(e => e.id);
        assert.ok(rankedBlur.includes('Filter › Gaussian Blur…'));
        assert.ok(rankedBlur.includes('Filter › Motion Blur…'));

        // Empty query returns everything, enabled first
        const all = CommandPaletteSearch.rank(entries, '');
        assert.equal(all.length, entries.length);
        assert.equal(all[all.length - 1].id, 'Edit › Undo');
        assert.equal(all[0].id, 'Edit › Paste');
    });

    it('Whole word matches beat scattered letters and maintains selection stability', () => {
        const entries = [
            new CommandPaletteEntry('Layer › New Adjustment Layer › Hue/Saturation…'),
            new CommandPaletteEntry('Tool › Lasso'),
            new CommandPaletteEntry('Tool › Polygonal Lasso')
        ];

        const ranked = CommandPaletteSearch.rank(entries, 'lasso');
        assert.equal(ranked[0].id, 'Tool › Lasso');
        assert.equal(ranked[1].id, 'Tool › Polygonal Lasso');

        const model = new CommandPaletteModel(entries);
        model.query = 'lasso';
        model.move(1);
        assert.equal(model.selected.id, 'Tool › Polygonal Lasso');
        model.query = 'lasso';
        assert.equal(model.selected.id, 'Tool › Polygonal Lasso');
    });

    it('Typed words starting words rank short titles highest', () => {
        const entries = [
            new CommandPaletteEntry('Layer › New Adjustment Layer › Curves…'),
            new CommandPaletteEntry('Layer › New Adjustment Layer › Exposure…'),
            new CommandPaletteEntry('Layer › Duplicate Layer'),
            new CommandPaletteEntry('Layer › New Blank Layer')
        ];

        const ranked = CommandPaletteSearch.rank(entries, 'new layer');
        assert.equal(ranked[0].id, 'Layer › New Blank Layer');
    });
});
