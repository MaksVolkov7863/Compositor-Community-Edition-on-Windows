const { describe, it } = require('node:test');
const assert = require('node:assert');
const { BLEND_MODES, mapBlendMode } = require('../src/engine/blend-modes');

describe('Engine Submodule: Blend Modes', () => {
    it('defines standard Photoshop blend modes list', () => {
        assert.ok(Array.isArray(BLEND_MODES));
        assert.ok(BLEND_MODES.includes('Normal'));
        assert.ok(BLEND_MODES.includes('Multiply'));
        assert.ok(BLEND_MODES.includes('Screen'));
        assert.ok(BLEND_MODES.includes('Overlay'));
        assert.ok(BLEND_MODES.includes('Hard Light'));
    });

    it('maps blend modes to standard canvas globalCompositeOperation strings', () => {
        assert.equal(mapBlendMode('Normal'), 'source-over');
        assert.equal(mapBlendMode('Multiply'), 'multiply');
        assert.equal(mapBlendMode('Screen'), 'screen');
        assert.equal(mapBlendMode('Overlay'), 'overlay');
        assert.equal(mapBlendMode('Difference'), 'difference');
        assert.equal(mapBlendMode('Unknown'), 'source-over');
    });
});
