/**
 * Curves (Image > Adjustments > Curves…), after the macOS CurvesSettings:
 * a composite RGB curve plus one per channel, 2–32 points each, interpolated with a
 * shape-preserving cubic Hermite (Fritsch–Carlson) so it never overshoots between handles.
 * Each channel runs through its own curve, then through the RGB curve; alpha is kept.
 */
(function (root) {

const CURVE_CHANNELS = ['RGB', 'Red', 'Green', 'Blue'];
const MAX_POINTS = 32;

const identityCurve = () => [{ x: 0, y: 0 }, { x: 255, y: 255 }];

class CurvesSettings {
    constructor(channels = null) {
        this.channel = 0;
        this.channels = channels
            ? channels.map(points => points.map(p => ({ x: p.x, y: p.y })))
            : CURVE_CHANNELS.map(identityCurve);
    }

    clone() {
        const copy = new CurvesSettings(this.channels);
        copy.channel = this.channel;
        return copy;
    }

    get isValid() {
        return this.channels.length === 4 && this.channels.every(points =>
            points.length >= 2 && points.length <= MAX_POINTS && points[0].x === 0 && points[points.length - 1].x === 255
            && points.every(p => Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 0 && p.x <= 255 && p.y >= 0 && p.y <= 255)
            && points.every((p, i) => i === 0 || points[i - 1].x < p.x));
    }

    get isIdentity() {
        return this.channels.every(points => points.every(p => p.x === p.y));
    }

    value(x, channel = this.channel) {
        const p = this.channels[channel];
        let i = 0;
        for (let k = 0; k < p.length; k++) if (p[k].x <= x) i = k;
        i = Math.min(p.length - 2, Math.max(0, i));
        const d = [];
        for (let k = 0; k + 1 < p.length; k++) d.push((p[k + 1].y - p[k].y) / (p[k + 1].x - p[k].x));
        const slope = (j) => {
            if (j === 0) return d[0];
            if (j === p.length - 1) return d[d.length - 1];
            if (d[j - 1] * d[j] <= 0) return 0;
            return 2 / (1 / d[j - 1] + 1 / d[j]);
        };
        const h = p[i + 1].x - p[i].x;
        const t = Math.min(1, Math.max(0, (x - p[i].x) / h));
        const y = (2 * t * t * t - 3 * t * t + 1) * p[i].y + (t * t * t - 2 * t * t + t) * h * slope(i)
            + (-2 * t * t * t + 3 * t * t) * p[i + 1].y + (t * t * t - t * t) * h * slope(i + 1);
        return Math.min(255, Math.max(0, y));
    }

    // Lookup tables for red, green and blue: the channel's curve, then the RGB curve.
    tables() {
        return [1, 2, 3].map(channel => {
            const table = new Uint8ClampedArray(256);
            for (let i = 0; i < 256; i++) table[i] = Math.round(this.value(this.value(i, channel), 0));
            return table;
        });
    }

    // Adds a point unless one is already within a pixel; returns its index or -1.
    addPoint(x, y, channel = this.channel) {
        const points = this.channels[channel];
        if (points.length >= MAX_POINTS || x <= 1 || x >= 254 || points.some(p => Math.abs(p.x - x) <= 1)) return -1;
        const point = { x, y: Math.min(255, Math.max(0, y)) };
        points.push(point);
        points.sort((a, b) => a.x - b.x);
        return points.indexOf(point);
    }

    // Moves a point; the ends keep their input, the others stay between their neighbors.
    movePoint(index, x, y, channel = this.channel) {
        const points = this.channels[channel];
        const p = points[index];
        if (!p) return;
        p.y = Math.min(255, Math.max(0, y));
        if (index > 0 && index < points.length - 1) {
            p.x = Math.min(points[index + 1].x - 1, Math.max(points[index - 1].x + 1, x));
        }
    }

    removePoint(index, channel = this.channel) {
        const points = this.channels[channel];
        if (index <= 0 || index >= points.length - 1) return false;
        points.splice(index, 1);
        return true;
    }

    reset(channel = this.channel) {
        this.channels[channel] = identityCurve();
    }

    // The point nearest (x, y) within `radius` curve units, or -1.
    hitTest(x, y, radius = 14, channel = this.channel) {
        let best = -1, bestDistance = Infinity;
        this.channels[channel].forEach((p, i) => {
            const distance = Math.hypot(p.x - x, p.y - y);
            if (distance < bestDistance) { best = i; bestDistance = distance; }
        });
        return bestDistance < radius ? best : -1;
    }

    // Writes `source` through the curves into `target` (both RGBA ImageData-like).
    applyTo(source, target = source) {
        const [r, g, b] = this.tables();
        const s = source.data, t = target.data;
        for (let i = 0; i < s.length; i += 4) {
            t[i] = r[s[i]];
            t[i + 1] = g[s[i + 1]];
            t[i + 2] = b[s[i + 2]];
            t[i + 3] = s[i + 3];
        }
        return target;
    }
}

const api = { CurvesSettings, CURVE_CHANNELS };
if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
} else {
    root.CurvesSettings = CurvesSettings;
    root.CURVE_CHANNELS = CURVE_CHANNELS;
}
})(typeof globalThis !== 'undefined' ? globalThis : this);
