// The breathing orb: core, halo, inner grains and exhale rings.
import { radialSprite, dotSprite } from './sprites.js';

const RINGS = 3;
const GRAINS = 48;
const TAU = Math.PI * 2;

export class Orb {
  constructor() {
    this.core = radialSprite(256, [
      [0, '#e9e3ff'], [0.25, '#d2c6ff'], [0.58, '#a596ff'], [0.84, 'rgba(115,103,240,0.9)'], [1, 'rgba(115,103,240,0)']
    ]);
    this.halo = radialSprite(256, [
      [0, 'rgba(203,188,255,0.55)'], [0.35, 'rgba(140,124,255,0.22)'], [0.7, 'rgba(115,103,240,0.07)'], [1, 'rgba(115,103,240,0)']
    ]);
    this.light = radialSprite(128, [[0, 'rgba(255,255,255,0.9)'], [0.5, 'rgba(255,250,240,0.25)'], [1, 'rgba(255,255,255,0)']]);
    this.ringAge = new Float32Array(RINGS).fill(-1);
    this.ringR0 = new Float32Array(RINGS);
    this.nextRing = 0;
    this.time = 0;
    this.r = 0;
    // Pseudo-random grain positions inside the orb.
    this.ga = new Float32Array(GRAINS);
    this.gr = new Float32Array(GRAINS);
    this.gs = new Float32Array(GRAINS);
    for (let i = 0; i < GRAINS; i++) {
      this.ga[i] = Math.random() * TAU;
      this.gr[i] = Math.sqrt(Math.random()) * 0.72;
      this.gs[i] = 0.4 + Math.random() * 0.8;
    }
  }

  radius(minDim, b, scale = 1) {
    return minDim * (0.18 + 0.16 * b) * scale;
  }

  // Launch one ripple ring from the current edge.
  ring() {
    const i = this.nextRing;
    this.nextRing = (i + 1) % RINGS;
    this.ringAge[i] = 0;
    this.ringR0[i] = this.r;
  }

  update(dt, reduced) {
    this.time += dt;
    const speed = reduced ? 0.18 : 0.26;
    for (let i = 0; i < RINGS; i++) {
      if (this.ringAge[i] < 0) continue;
      this.ringAge[i] += dt * speed;
      if (this.ringAge[i] >= 1) this.ringAge[i] = -1;
    }
  }

  // opts: scale, alpha, fill (0..1 grains), grainColor, c (coherence)
  draw(ctx, x, y, minDim, b, c, scale = 1, alpha = 1, fill = 0, grainColor = null, reduced = false) {
    const r = this.radius(minDim, b, scale);
    this.r = r;
    const prev = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'lighter';

    // Rings
    ctx.lineWidth = Math.max(1, minDim * 0.004 * scale);
    for (let i = 0; i < RINGS; i++) {
      const a = this.ringAge[i];
      if (a < 0) continue;
      const rr = this.ringR0[i] + a * minDim * (reduced ? 0.22 : 0.34) * scale;
      const k = (1 - a);
      ctx.strokeStyle = `rgba(203,188,255,${(k * k * (0.22 + 0.18 * c) * alpha).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(x, y, rr, 0, TAU);
      ctx.stroke();
    }

    // Halo
    const hr = r * (2.3 + 0.3 * c);
    ctx.globalAlpha = alpha * (0.35 + 0.35 * b) * (0.65 + 0.35 * c);
    ctx.drawImage(this.halo, x - hr, y - hr, hr * 2, hr * 2);

    // Core
    ctx.globalCompositeOperation = prev;
    ctx.globalAlpha = alpha * 0.92;
    ctx.drawImage(this.core, x - r * 1.12, y - r * 1.12, r * 2.24, r * 2.24);

    ctx.globalCompositeOperation = 'lighter';
    // Inner glow brightens on inhale, plus a slow shimmer.
    const lr = r * (0.55 + 0.25 * b);
    const sx = x + Math.cos(this.time * 0.7) * r * 0.12;
    const sy = y + Math.sin(this.time * 0.5) * r * 0.1 - r * 0.08;
    ctx.globalAlpha = alpha * (0.08 + 0.22 * b) * (0.7 + 0.3 * c);
    ctx.drawImage(this.light, sx - lr, sy - lr, lr * 2, lr * 2);

    // Luminous grains filling the orb (normal blending, so they keep their color).
    ctx.globalCompositeOperation = prev;
    if (fill > 0.01 && grainColor) {
      const spr = dotSprite(grainColor);
      const n = Math.floor(GRAINS * fill);
      const rot = this.time * 0.12;
      for (let i = 0; i < n; i++) {
        const a = this.ga[i] + rot * this.gs[i];
        const gr = this.gr[i] * r;
        const gx = x + Math.cos(a) * gr;
        const gy = y + Math.sin(a) * gr * 0.9 + r * 0.08;
        const s = r * (0.05 + 0.03 * this.gs[i]);
        ctx.globalAlpha = alpha * 0.4 * (0.6 + 0.4 * Math.sin(this.time * 1.3 + i));
        ctx.drawImage(spr, gx - s, gy - s, s * 2, s * 2);
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = prev;
    return r;
  }
}
