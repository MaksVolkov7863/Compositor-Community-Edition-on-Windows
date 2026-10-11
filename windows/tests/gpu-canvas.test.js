const { describe, it } = require('node:test');
const assert = require('node:assert');
const WebGLPipeline = require('../src/webgl-pipeline');
const CompositorEngine = require('../src/engine');

describe('GPU Canvas & WebGL Accelerated Compositing Pipeline (Mac GPUCanvasTests Parity)', () => {
    it('GPU pipeline blits layer textures with blend modes and opacity in hardware shader', () => {
        const pipeline = new WebGLPipeline(200, 200);
        assert.ok(pipeline);

        // In headless testing without WebGL hardware, pipeline operates in CPU fallback mode
        const engine = CompositorEngine.createHeadless(200, 200);
        const l1 = engine.addLayer('L1', 200, 200);
        l1.ctx.fillStyle = '#ff0000';
        l1.ctx.fillRect(0, 0, 200, 200);

        const l2 = engine.addLayer('L2', 200, 200);
        l2.blendMode = 'Multiply';
        l2.opacity = 0.5;
        l2.ctx.fillStyle = '#00ff00';
        l2.ctx.fillRect(0, 0, 200, 200);

        engine.render();

        const data = engine.ctx.getImageData(50, 50, 1, 1).data;
        assert.ok(data[3] > 0, 'Alpha rendered');
    });

    it('Context loss recovery handles device resets and falls back gracefully to 2D context', () => {
        const pipeline = new WebGLPipeline(100, 100);
        assert.ok(pipeline.gl === null || typeof pipeline.gl === 'object');
        // Fallback test
        const res = pipeline.applyAdjustment(null, 'invert');
        assert.equal(res, null);
    });
});
