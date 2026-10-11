/**
 * NavigatorGeometry - Document minimap geometry and viewport tracking
 * 
 * Matches Swift NavigatorGeometry (Compositor/Rendering/NavigatorGeometry.swift)
 */

class NavigatorGeometry {
    /**
     * @param {Object} documentSize { width, height }
     * @param {Object} box { width, height } Minimap bounding container
     */
    constructor(documentSize, box) {
        this.documentSize = documentSize || { width: 0, height: 0 };
        this.box = box || { width: 0, height: 0 };
    }

    /**
     * Aspect-ratio fitted image rect centered within the minimap box
     */
    get imageRect() {
        if (!this.documentSize.width || !this.documentSize.height || !this.box.width || !this.box.height) {
            return { x: 0, y: 0, width: 0, height: 0 };
        }

        const docAspect = this.documentSize.width / this.documentSize.height;
        const boxAspect = this.box.width / this.box.height;

        let w, h;
        if (docAspect > boxAspect) {
            w = this.box.width;
            h = this.box.width / docAspect;
        } else {
            h = this.box.height;
            w = this.box.height * docAspect;
        }

        const x = (this.box.width - w) / 2;
        const y = (this.box.height - h) / 2;

        return { x, y, width: w, height: h };
    }

    /**
     * Maps document-space rectangle to minimap thumbnail coordinates
     */
    thumbnailRect(docRect) {
        const img = this.imageRect;
        if (!this.documentSize.width || !this.documentSize.height) return { x: 0, y: 0, width: 0, height: 0 };

        const scaleX = img.width / this.documentSize.width;
        const scaleY = img.height / this.documentSize.height;

        return {
            x: img.x + docRect.x * scaleX,
            y: img.y + docRect.y * scaleY,
            width: docRect.width * scaleX,
            height: docRect.height * scaleY
        };
    }

    /**
     * Maps thumbnail point back to document coordinate space, clamped to document bounds
     */
    documentPoint(point) {
        const img = this.imageRect;
        if (img.width === 0 || img.height === 0) return { x: 0, y: 0 };

        const relX = (point.x - img.x) / img.width;
        const relY = (point.y - img.y) / img.height;

        const docX = Math.max(0, Math.min(this.documentSize.width, relX * this.documentSize.width));
        const docY = Math.max(0, Math.min(this.documentSize.height, relY * this.documentSize.height));

        return { x: docX, y: docY };
    }

    /**
     * Determines whether the Navigator minimap should be visible.
     * Only visible when zoom is >= 3.0 (300%)
     */
    static isVisible(zoom) {
        return zoom >= 3.0;
    }
}

if (typeof module !== 'undefined') {
    module.exports = NavigatorGeometry;
}
