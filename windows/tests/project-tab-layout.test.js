const { describe, it } = require('node:test');
const assert = require('node:assert');
const { projectTabOverflow, projectTabOverflowLabel } = require('../src/project-tab-layout');

describe('Project Tabs Overflow & Layout Pipeline (Mac ProjectTabLayoutTests Parity)', () => {
    const a = 'tab_a', b = 'tab_b', c = 'tab_c', d = 'tab_d', e = 'tab_e';
    const widths = { [a]: 100, [b]: 100, [c]: 100, [d]: 100, [e]: 100 };
    const pill = () => 80;

    it('Everything fits shows all tabs with no overflow pill', () => {
        const order = [a, b, c];
        const res = projectTabOverflow({ order, widths, selectedID: c, availableWidth: 400, pillWidth: pill, spacing: 6 });

        assert.deepEqual(res.hiddenIDs, []);
        assert.equal(res.pill, null);
        assert.deepEqual(res.visible.map(t => t.id), order);
        assert.deepEqual(res.visible.map(t => t.x), [0, 106, 212]);
        assert.equal(res.contentWidth, 312);
    });

    it('Overflow hides leftmost tabs and groups them into pill', () => {
        const order = [a, b, c, d, e];
        // Room for pill (80) + spacing (6) + tabs (292)
        const res = projectTabOverflow({ order, widths, selectedID: e, availableWidth: 300, pillWidth: pill, spacing: 6 });

        assert.deepEqual(res.hiddenIDs, [a, b, c]);
        assert.deepEqual(res.visible.map(t => t.id), [d, e]);
        assert.equal(res.pill.width, 80);
        assert.equal(res.visible[0].x, 86);
        assert.equal(res.contentWidth, 292);
    });

    it('Selected tab in hidden set is pinned right of the pill', () => {
        const order = [a, b, c, d, e];
        const res = projectTabOverflow({ order, widths, selectedID: a, availableWidth: 300, pillWidth: pill, spacing: 6 });

        assert.deepEqual(res.visible.map(t => t.id), [a, e]);
        assert.deepEqual(res.hiddenIDs, [b, c, d]);
        assert.equal(res.pill.width, 80);
    });

    it('Overflow label formats singular and plural tab counts', () => {
        assert.equal(projectTabOverflowLabel(1), '1 more tab');
        assert.equal(projectTabOverflowLabel(2), '2 more tabs');
        assert.equal(projectTabOverflowLabel(11), '11 more tabs');
    });

    it('Unmeasured available width shows everything without truncating', () => {
        const order = [a, b, c, d, e];
        const res = projectTabOverflow({ order, widths, selectedID: a, availableWidth: 0, pillWidth: pill });
        assert.deepEqual(res.hiddenIDs, []);
        assert.equal(res.pill, null);
        assert.equal(res.visible.length, 5);
    });
});
