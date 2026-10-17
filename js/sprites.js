// Pre-rendered radial sprites, so nothing builds gradients per frame.

export function radialSprite(size, stops) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const r = size / 2;
  const grad = g.createRadialGradient(r, r, 0, r, r, r);
  for (const [o, col] of stops) grad.addColorStop(o, col);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgba([r, g, b], a) {
  return `rgba(${r},${g},${b},${a})`;
}

const dotCache = new Map();
// Soft glowing dot in the given color (cached).
export function dotSprite(hex) {
  let s = dotCache.get(hex);
  if (!s) {
    const c = hexToRgb(hex);
    s = radialSprite(32, [[0, rgba(c, 1)], [0.25, rgba(c, 0.7)], [0.6, rgba(c, 0.18)], [1, rgba(c, 0)]]);
    dotCache.set(hex, s);
  }
  return s;
}
