/**
 * Transform, Snapping & Geometric Operations
 * Viewport rotation, handle snapping, layer cropping.
 */

function normalizeRotation(angle) {
    let norm = angle % 360;
    if (norm > 180) norm -= 360;
    if (norm < -180) norm += 360;

    const snapThreshold = 5;
    for (const snap of [0, 90, -90, 180, -180]) {
        if (Math.abs(norm - snap) <= snapThreshold) {
            norm = snap;
            break;
        }
    }
    return norm;
}

function snappedResize(layer, canvasWidth, canvasHeight, otherLayers, handle, point, options = {}) {
    if (!layer) return point;

    const tolerance = options.tolerance || 5;
    const lockRatio = !!options.lockRatio;
    let sx = point.x, sy = point.y;

    // Snap to document edges
    if (Math.abs(sx - 0) <= tolerance) sx = 0;
    if (Math.abs(sx - canvasWidth) <= tolerance) sx = canvasWidth;
    if (Math.abs(sy - 0) <= tolerance) sy = 0;
    if (Math.abs(sy - canvasHeight) <= tolerance) sy = canvasHeight;

    // Snap to other visible layers
    if (Array.isArray(otherLayers)) {
        for (const other of otherLayers) {
            if (other.id === layer.id || !other.visible) continue;
            if (Math.abs(sx - other.x) <= tolerance) sx = other.x;
            if (Math.abs(sx - (other.x + other.width)) <= tolerance) sx = other.x + other.width;
            if (Math.abs(sy - other.y) <= tolerance) sy = other.y;
            if (Math.abs(sy - (other.y + other.height)) <= tolerance) sy = other.y + other.height;
        }
    }

    if (lockRatio && layer.width > 0 && layer.height > 0) {
        const aspect = layer.width / layer.height;
        const newW = sx - layer.x;
        const newH = sy - layer.y;
        if (Math.abs(newW) > Math.abs(newH * aspect)) {
            sy = layer.y + newW / aspect;
        } else {
            sx = layer.x + newH * aspect;
        }
    }

    return { x: sx, y: sy };
}

function cropLayerToCanvas(layer, canvasWidth, canvasHeight, createCanvas) {
    if (!layer || !layer.canvas) return false;

    const newX = Math.max(0, layer.x);
    const newY = Math.max(0, layer.y);
    const newW = Math.max(1, Math.min(canvasWidth - newX, layer.width));
    const newH = Math.max(1, Math.min(canvasHeight - newY, layer.height));

    const croppedCanvas = createCanvas(newW, newH);
    const cCtx = croppedCanvas.getContext('2d');
    cCtx.drawImage(layer.canvas, newX - layer.x, newY - layer.y, newW, newH, 0, 0, newW, newH);

    layer.canvas = croppedCanvas;
    layer.ctx = cCtx;
    layer.x = newX;
    layer.y = newY;
    layer.width = newW;
    layer.height = newH;
    layer.croppedToCanvas = true;

    return true;
}

module.exports = {
    normalizeRotation,
    snappedResize,
    cropLayerToCanvas
};
