// SAND: touch pours sand; RAKE carves glowing grooves with 8-fold symmetry.
import { Sim, SAND } from './sim.js';
import { SAND_PALETTE } from './scenes.js';
import { P } from './particles.js';

const COS = [], SIN = [];
for (let k = 0; k < 8; k++) { COS.push(Math.cos(k * Math.PI / 4)); SIN.push(Math.sin(k * Math.PI / 4)); }

export class SandMode {
  constructor(app) {
    this.app = app;
    this.name = 'sand';
    this.sim = new Sim();
    this.rake = false;
    this.pourT = 0;
    this.stratum = 0;
    this.sparkT = 0;
    this.raking = 0;
    this.ready = false;
    app.onResize.push(() => this.sim.resize(app.w, app.h));
  }

  enter() {
    if (!this.ready) {
      this.ready = true;
      this.sim.resize(this.app.w, this.app.h);
      this.sim.setPalette(SAND_PALETTE);
    }
  }

  exit() {
    if (this.app.audio) this.app.audio.setGrain(0);
  }

  setRake(on) { this.rake = on; }
  wave() { this.sim.startWave(5); }
  shake() { this.sim.startWave(5); }

  down() {}
  up() {}

  move(p, px, py) {
    if (!this.rake) return;
    const a = this.app;
    const sim = this.sim;
    const sx = sim.W / a.w;
    // Carve along the segment, mirrored 8 times around the screen center.
    const cx = sim.W / 2, cy = sim.H / 2;
    const x0 = px * sx - cx, y0 = py * sx - cy;
    const x1 = p.x * sx - cx, y1 = p.y * sx - cy;
    const len = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(1, Math.ceil(len / 0.7));
    for (let s = 0; s <= n; s++) {
      const u = x0 + (x1 - x0) * s / n;
      const v = y0 + (y1 - y0) * s / n;
      for (let k = 0; k < 8; k++) this.carve(cx + u * COS[k] - v * SIN[k], cy + u * SIN[k] + v * COS[k]);
    }
    this.raking = Math.min(1, this.raking + len * 0.05);
    // Faint sparkles show the symmetry even where there is no sand yet.
    const now = performance.now();
    if (now - this.sparkT > 60) {
      this.sparkT = now;
      const inv = a.w / sim.W;
      const step = a.reduced ? 2 : 1;
      for (let k = 0; k < 8; k += step) {
        a.particles.spawn(P.SPARKLE, (cx + x1 * COS[k] - y1 * SIN[k]) * inv, (cy + x1 * SIN[k] + y1 * COS[k]) * inv, 0, 0, 0.9, 2.5, 7);
      }
    }
  }

  carve(gx, gy) {
    const { W, H, cell, tone } = this.sim;
    const x = gx | 0, y = gy | 0;
    for (let dy = -1; dy <= 1; dy++) {
      const yy = y + dy;
      if (yy < 0 || yy >= H) continue;
      for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx;
        if (xx < 0 || xx >= W || (dx && dy)) continue;
        const i = yy * W + xx;
        if (cell[i] === SAND) tone[i] |= 0x80;
      }
    }
  }

  step() {
    this.sim.wind = this.app.wind;
    this.sim.step();
  }

  update(dt, now) {
    const a = this.app;
    const sim = this.sim;
    let pouring = 0;
    if (!this.rake && !sim.wave) {
      for (const p of a.pointers.values()) {
        const width = 1 + Math.min(6, p.speed * 5) + p.pressure * 2;
        const rate = 220 + 160 * Math.min(1, p.speed);
        p.acc = (p.acc || 0) + rate * dt;
        const n = p.acc | 0;
        p.acc -= n;
        const gx = p.x / a.w * sim.W, gy = p.y / a.h * sim.H;
        for (let i = 0; i < n; i++) {
          sim.add(gx + (Math.random() - 0.5) * 2 * width, gy + (Math.random() - 0.5) * 2, SAND, this.stratum);
        }
        pouring = Math.max(pouring, 0.5 + 0.5 * Math.min(1, p.speed));
      }
      if (pouring) {
        this.pourT += dt;
        if (this.pourT > 3) { this.pourT = 0; this.stratum = (this.stratum + 1) & 7; }
      }
    }
    this.raking *= Math.exp(-dt / 0.25);
    if (sim.fill > 0.7) sim.startWave(6);
    if (sim.landed > 0) {
      if (a.pointers.size) a.haptics.tick(now);
      sim.landed = 0;
    }
    if (a.audio) a.audio.setGrain(Math.max(pouring, this.raking * 0.4));
  }

  render(ctx) {
    const a = this.app;
    ctx.fillStyle = a.bg;
    ctx.fillRect(0, 0, a.w, a.h);
    this.sim.render();
    this.sim.draw(ctx, a.w, a.h, 0.1 + 0.1 * a.c);
    if (this.sim.wave && this.sim.wave.front != null) {
      const fl = a.modes.flow;
      const fx = this.sim.wave.front * a.w;
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(fl.waveSprite, fx - a.w * 0.22, 0, a.w * 0.24, a.h);
      ctx.globalCompositeOperation = 'source-over';
    }
    // A small breathing orb keeps the pace.
    const x = a.w / 2, y = a.h * 0.11 + 10;
    a.orbX = x; a.orbY = y;
    a.orb.draw(ctx, x, y, a.minDim, a.breath.b, a.c, 0.32, 0.75, 0, null, a.reduced);
    a.particles.draw(ctx);
  }
}
