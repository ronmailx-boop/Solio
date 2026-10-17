// Small additive particle layer (< 300): sparkles, fireflies, embers, spray.
import { dotSprite } from './sprites.js';

export const MAX = 280;
export const P = { SPARKLE: 0, FIREFLY: 1, EMBER: 2, SPRAY: 3, MOTE: 4 };
export const COLORS = ['#fff6d8', '#cbbcff', '#e8c9a0', '#8fc4ff', '#ffb070', '#d9ff9e', '#8affc9', '#b59cff'];

export class Particles {
  constructor() {
    this.x = new Float32Array(MAX);
    this.y = new Float32Array(MAX);
    this.vx = new Float32Array(MAX);
    this.vy = new Float32Array(MAX);
    this.life = new Float32Array(MAX);
    this.max = new Float32Array(MAX);
    this.size = new Float32Array(MAX);
    this.seed = new Float32Array(MAX);
    this.kind = new Uint8Array(MAX);
    this.color = new Uint8Array(MAX);
    this.alive = new Uint8Array(MAX);
    this.count = 0;
    this.cursor = 0;
    this.sprites = COLORS.map((c) => dotSprite(c));
    this.time = 0;
  }

  spawn(kind, x, y, vx, vy, life, size, color) {
    // Find a free slot (round robin); if full, overwrite the oldest-ish slot.
    let i = this.cursor;
    for (let n = 0; n < MAX; n++) {
      const k = (this.cursor + n) % MAX;
      if (!this.alive[k]) { i = k; break; }
    }
    this.cursor = (i + 1) % MAX;
    if (!this.alive[i]) this.count++;
    this.alive[i] = 1;
    this.kind[i] = kind;
    this.x[i] = x; this.y[i] = y;
    this.vx[i] = vx; this.vy[i] = vy;
    this.life[i] = 0; this.max[i] = life;
    this.size[i] = size;
    this.color[i] = color;
    this.seed[i] = Math.random() * 100;
  }

  clear() {
    this.alive.fill(0);
    this.count = 0;
  }

  update(dt, w, h, wind) {
    this.time += dt;
    const t = this.time;
    for (let i = 0; i < MAX; i++) {
      if (!this.alive[i]) continue;
      this.life[i] += dt;
      if (this.life[i] >= this.max[i]) { this.alive[i] = 0; this.count--; continue; }
      const k = this.kind[i];
      if (k === P.FIREFLY) {
        const s = this.seed[i];
        this.vx[i] += (Math.sin(t * 0.37 + s) * 6 - this.vx[i] * 0.3) * dt;
        this.vy[i] += (Math.cos(t * 0.29 + s * 1.7) * 5 - this.vy[i] * 0.3) * dt;
      } else if (k === P.EMBER) {
        this.vx[i] += (Math.sin(t * 0.8 + this.seed[i]) * 4 + wind * 6) * dt;
      } else if (k === P.SPRAY) {
        this.vy[i] += 40 * dt;
      } else if (k === P.MOTE) {
        this.vx[i] += wind * 3 * dt;
      }
      this.x[i] += this.vx[i] * dt;
      this.y[i] += this.vy[i] * dt;
      if (this.x[i] < -20 || this.x[i] > w + 20 || this.y[i] < -40 || this.y[i] > h + 20) {
        this.alive[i] = 0; this.count--;
      }
    }
  }

  draw(ctx, alpha = 1) {
    if (!this.count) return;
    const prev = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'lighter';
    const t = this.time;
    for (let i = 0; i < MAX; i++) {
      if (!this.alive[i]) continue;
      const q = this.life[i] / this.max[i];
      // Soft in, soft out.
      let a = q < 0.2 ? q / 0.2 : (1 - q) / 0.8;
      const k = this.kind[i];
      // Slow blinks only (well below 3 Hz).
      if (k === P.FIREFLY) a *= 0.55 + 0.45 * Math.sin(t * 1.6 + this.seed[i]);
      else if (k === P.EMBER) a *= 0.7 + 0.3 * Math.sin(t * 2.2 + this.seed[i]);
      else if (k === P.SPARKLE) a *= 0.8;
      if (a <= 0.01) continue;
      const s = this.size[i];
      ctx.globalAlpha = a * alpha;
      ctx.drawImage(this.sprites[this.color[i]], this.x[i] - s, this.y[i] - s, s * 2, s * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = prev;
  }
}
