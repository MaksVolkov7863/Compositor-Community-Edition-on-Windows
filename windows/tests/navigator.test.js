const { describe, it } = require('node:test');
const assert = require('node:assert');
const NavigatorGeometry = require('../src/navigator');

describe('Navigator Minimap & Viewport Tracking Pipeline (Mac NavigatorTests Parity)', () => {
    it('Navigator geometry fits document aspect ratio centered within bounding container', () => {
        const geom = new NavigatorGeometry({ width: 400, height: 200 }, { width: 200, height: 200 });
        const img = geom.imageRect;
        assert.equal(img.x, 0);
        assert.equal(img.y, 50);
        assert.equal(img.width, 200);
        assert.equal(img.height, 100);

        // Thumbnail rect for a document sub-rect
        const sub = geom.thumbnailRect({ x: 100, y: 50, width: 200, height: 100 });
        assert.equal(sub.x, 50);
        assert.equal(sub.y, 75);
        assert.equal(sub.width, 100);
        assert.equal(sub.height, 50);
    });

    it('Document point maps clicked minimap coordinates back to document bounds clamped', () => {
        const geom = new NavigatorGeometry({ width: 400, height: 200 }, { width: 200, height: 200 });
        const pt = geom.documentPoint({ x: 100, y: 100 });
        assert.equal(pt.x, 200);
        assert.equal(pt.y, 100);

        // Out of bounds clicks clamp to document perimeter
        const outside = geom.documentPoint({ x: -20, y: 199 });
        assert.equal(outside.x, 0);
        assert.equal(outside.y, 200);
    });

    it('Navigator minimap activates only when canvas zoom reaches 300% (3.0×) and above', () => {
        assert.equal(NavigatorGeometry.isVisible(1.0), false);
        assert.equal(NavigatorGeometry.isVisible(2.5), false);
        assert.equal(NavigatorGeometry.isVisible(2.99), false);
        assert.equal(NavigatorGeometry.isVisible(3.0), true);
        assert.equal(NavigatorGeometry.isVisible(6.0), true);
    });
});
