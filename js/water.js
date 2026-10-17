// WATER: height-field ripples, floating lotus lights, pebbles and tilt slosh.
import { radialSprite, hexToRgb } from './sprites.js';
import { P } from './particles.js';

const TAU = Math.PI * 2;
const GW = 96;
const DAMP = 0.985;
const LOTUS = 6;

export class WaterMode {
  constructor(app) {
    this.app = app;
    this.name = 'water';
    this.W = 0;
    this.H = 0;
    this.lastWind = 0;
    this.lotus = [];
    this.time = 0;
    this.fish = null;
    this.surpriseT = 30 + Math.random() * 40;
    this.canvas = document.createElement('canvas');
    this.g = this.canvas.getContext('2d');
    this.glowSprite = radialSprite(128, [[0, 'rgba(255,236,214,0.95)'], [0.2, 'rgba(255,214,190,0.55)'], [0.5, 'rgba(203,168,255,0.16)'], [1, 'rgba(160,130,255,0)']]);
    this.tintA = hexToRgb('#6fb7ff');
    this.tintB = hexToRgb('#8f7cff');
    app.onResize.push(() => this.resize());
  }

  resize() {
    const a = this.app;
    const H = Math.max(30, Math.round(GW * a.h / a.w));
    if (H !== this.H) {
      this.W = GW;
      this.H = H;
      this.cur = new Float32Array(GW * H);
      this.prev = new Float32Array(GW * H);
      this.canvas.width = GW;
      this.canvas.height = H;
      this.image = this.g.createImageData(GW, H);
      this.px = new Uint32Array(this.image.data.buffer);
      // Row base colors: deep indigo-blue, slightly lighter toward the bottom.
      this.baseR = new Float32Array(H);
      this.baseG = new Float32Array(H);
      this.baseB = new Float32Array(H);
      for (let y = 0; y < H; y++) {
        const k = y / (H - 1);
        this.baseR[y] = 14 + 6 * k;
        this.baseG[y] = 14 + 10 * k;
        this.baseB[y] = 38 + 20 * k;
      }
    }
    for (const l of this.lotus) {
      l.x = Math.min(l.x, a.w - 20);
      l.y = Math.min(l.y, a.h * 0.8);
    }
  }

  enter() {
    if (!this.W) this.resize();
    if (!this.lotus.length) {
      const a = this.app;
      for (let i = 0; i < LOTUS; i++) {
        this.lotus.push({
          x: a.w * (0.15 + 0.7 * Math.random()),
          y: a.h * (0.25 + 0.55 * Math.random()),
          vx: (Math.random() - 0.5) * 6,
          vy: (Math.random() - 0.5) * 6,
          glow: 0,
          note: i,
          rot: Math.random() * TAU,
          seed: Math.random() * 100
        });
      }
    }
  }

  exit() {}

  disturb(px, py, r, amp) {
    const a = this.app;
    const { W, H, cur } = this;
    const gx = px / a.w * W, gy = py / a.h * H;
    const x0 = Math.max(1, Math.floor(gx - r)), x1 = Math.min(W - 2, Math.ceil(gx + r));
    const y0 = Math.max(1, Math.floor(gy - r)), y1 = Math.min(H - 2, Math.ceil(gy + r));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const d = Math.hypot(x - gx, y - gy) / r;
        if (d < 1) cur[y * W + x] += amp * (0.5 + 0.5 * Math.cos(Math.PI * d));
      }
    }
  }

  onExhale() {
    // A soft swell from the orb's reflection on each out-breath.
    const a = this.app;
    this.disturb(a.w / 2, a.h * 0.2, 5, a.reduced ? 0.25 : 0.4);
  }

  shake() {
    const a = this.app;
    for (let i = 0; i < 4; i++) this.disturb(a.w * Math.random(), a.h * Math.random(), 4, 1.2);
  }

  down(p) {
    const a = this.app;
    this.disturb(p.x, p.y, 2.5, 0.8);
    p.moved = 0;
    const hitR = a.minDim * 0.09;
    for (const l of this.lotus) {
      if (Math.hypot(l.x - p.x, l.y - p.y) < hitR) {
        l.glow = 1;
        l.vx += (l.x - p.x) * 0.3;
        l.vy += (l.y - p.y) * 0.3;
        if (a.audio) a.audio.note(l.note, 0.35);
        a.haptics.tick(performance.now(), 10);
        break;
      }
    }
  }

  move(p, px, py) {
    const d = Math.hypot(p.x - px, p.y - py);
    p.moved = (p.moved || 0) + d;
    // A slow drag leaves a gentle wake.
    const amp = Math.min(0.5, 0.12 + p.speed * 0.25);
    this.disturb(p.x, p.y, 2, amp);
  }

  up(p, cancelled) {
    if (cancelled) return;
    const held = performance.now() - p.t0;
    if (held > 380 && (p.moved || 0) < 14) {
      const a = this.app;
      this.disturb(p.x, p.y, 4.5, 3);
      if (a.audio) a.audio.pebble();
      a.haptics.tick(performance.now(), 18);
      const n = a.reduced ? 3 : 8;
      for (let i = 0; i < n; i++) {
        const ang = -Math.PI * Math.random();
        a.particles.spawn(P.SPRAY, p.x, p.y, Math.cos(ang) * 40, Math.sin(ang) * 50, 0.8, 2, 3);
      }
    }
  }

  step() {
    const { W, H } = this;
    // Tilt makes the surface slosh: changes in tilt push the edges.
    const a = this.app;
    const dw = a.wind - this.lastWind;
    this.lastWind = a.wind;
    if (Math.abs(dw) > 0.002) {
      const k = Math.max(-1.5, Math.min(1.5, dw * 25));
      for (let y = 1; y < H - 1; y++) {
        this.cur[y * W + 1] += k;
        this.cur[y * W + W - 2] -= k;
      }
    }
    for (let s = 0; s < 2; s++) {
      const cur = this.cur, prev = this.prev;
      for (let y = 1; y < H - 1; y++) {
        const row = y * W;
        for (let x = 1; x < W - 1; x++) {
          const i = row + x;
          prev[i] = ((cur[i - 1] + cur[i + 1] + cur[i - W] + cur[i + W]) * 0.5 - prev[i]) * DAMP;
        }
      }
      this.prev = cur;
      this.cur = prev;
    }
  }

  update(dt) {
    const a = this.app;
    this.time += dt;
    const { W, H } = this;
    for (const l of this.lotus) {
      // Drift downhill on the waves, with a slow wander.
      const gx = Math.max(1, Math.min(W - 2, (l.x / a.w * W) | 0));
      const gy = Math.max(1, Math.min(H - 2, (l.y / a.h * H) | 0));
      const i = gy * W + gx;
      const dx = this.cur[i + 1] - this.cur[i - 1];
      const dy = this.cur[i + W] - this.cur[i - W];
      l.vx += (-dx * 60 + Math.sin(this.time * 0.13 + l.seed) * 2 + a.wind * 6) * dt;
      l.vy += (-dy * 60 + Math.cos(this.time * 0.11 + l.seed) * 2) * dt;
      l.vx *= Math.exp(-dt * 0.6);
      l.vy *= Math.exp(-dt * 0.6);
      l.x += l.vx * dt;
      l.y += l.vy * dt;
      const m = a.minDim * 0.08;
      if (l.x < m) { l.x = m; l.vx = Math.abs(l.vx) * 0.5; }
      if (l.x > a.w - m) { l.x = a.w - m; l.vx = -Math.abs(l.vx) * 0.5; }
      if (l.y < a.h * 0.22) { l.y = a.h * 0.22; l.vy = Math.abs(l.vy) * 0.5; }
      if (l.y > a.h * 0.8) { l.y = a.h * 0.8; l.vy = -Math.abs(l.vy) * 0.5; }
      l.glow *= Math.exp(-dt / 1.8);
      l.rot += dt * 0.05;
    }
    this.surpriseT -= dt;
    if (this.surpriseT <= 0) {
      this.surpriseT = 30 + Math.random() * 60;
      if (Math.random() < 0.6 && !this.fish) {
        const dir = Math.random() < 0.5 ? 1 : -1;
        this.fish = { x: dir > 0 ? -40 : a.w + 40, y: a.h * (0.35 + Math.random() * 0.4), v: dir * a.w / 11, dir, t: 0, life: 12 };
      } else {
        const n = a.reduced ? 3 : 6;
        for (let i = 0; i < n; i++) {
          a.particles.spawn(P.FIREFLY, a.w * Math.random(), a.h * (0.25 + Math.random() * 0.5), 0, 0, 14 + Math.random() * 5, 3, 5);
        }
      }
    }
    if (this.fish) {
      const f = this.fish;
      f.t += dt;
      f.x += f.v * dt;
      if (f.t > f.life) this.fish = null;
      else if ((f.t * 30 | 0) % 6 === 0) this.disturb(f.x, f.y, 1.5, 0.05);
    }
  }

  renderSurface(b) {
    const { W, H, cur, px, baseR, baseG, baseB, tintA, tintB } = this;
    const lift = 0.92 + 0.12 * b;
    for (let y = 0; y < H; y++) {
      const row = y * W;
      const br = baseR[y] * lift, bg = baseG[y] * lift, bb = baseB[y] * lift;
      for (let x = 0; x < W; x++) {
        const i = row + x;
        const l = x > 0 ? cur[i - 1] : cur[i];
        const r = x < W - 1 ? cur[i + 1] : cur[i];
        const u = y > 0 ? cur[i - W] : cur[i];
        const d = y < H - 1 ? cur[i + W] : cur[i];
        const dx = r - l, dy = d - u;
        let s = dx - dy;                       // light from the upper left
        let t = 0.5 + s * 2.2;                 // refraction tint between blue and violet
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        let m = (Math.abs(dx) + Math.abs(dy)) * 2.6;
        m = m > 1 ? 1 : m;
        const tr = tintA[0] + (tintB[0] - tintA[0]) * t;
        const tg = tintA[1] + (tintB[1] - tintA[1]) * t;
        const tb = tintA[2] + (tintB[2] - tintA[2]) * t;
        let spec = s * 2.6 - 0.3;
        spec = spec > 0 ? (spec > 1 ? 1 : spec) : 0;
        spec = spec * spec * 120;
        let R = br + tr * m * 0.55 + spec;
        let G = bg + tg * m * 0.55 + spec * 0.95;
        let B = bb + tb * m * 0.55 + spec;
        R = R > 255 ? 255 : R; G = G > 255 ? 255 : G; B = B > 255 ? 255 : B;
        px[i] = (255 << 24) | ((B | 0) << 16) | ((G | 0) << 8) | (R | 0);
      }
    }
    this.g.putImageData(this.image, 0, 0);
  }

  render(ctx) {
    const a = this.app;
    const { w, h } = a;
    this.renderSurface(a.breath.b);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.canvas, 0, 0, w, h);

    if (this.fish) {
      const f = this.fish;
      const k = Math.min(1, f.t / 2, (f.life - f.t) / 2);
      const s = a.minDim * 0.06;
      ctx.save();
      ctx.translate(f.x, f.y + Math.sin(f.t * 0.9) * s * 0.4);
      ctx.scale(f.dir, 1);
      ctx.globalAlpha = 0.25 * k;
      ctx.fillStyle = '#05050f';
      ctx.beginPath();
      ctx.ellipse(0, 0, s, s * 0.36, 0, 0, TAU);
      ctx.moveTo(-s * 0.8, 0);
      const wag = Math.sin(f.t * 3) * s * 0.12;
      ctx.lineTo(-s * 1.5, -s * 0.4 + wag);
      ctx.lineTo(-s * 1.5, s * 0.4 + wag);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Mini orb, with its reflection.
    const ox = w / 2, oy = h * 0.11 + 10;
    a.orbX = ox; a.orbY = oy;
    a.orb.draw(ctx, ox, oy, a.minDim, a.breath.b, a.c, 0.32, 0.75, 0, null, a.reduced);

    // Lotus lights
    const r0 = a.minDim * 0.045;
    for (const l of this.lotus) {
      const gr = r0 * (2.4 + 1.4 * l.glow);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.28 + 0.5 * l.glow + 0.06 * Math.sin(this.time * 0.6 + l.seed);
      ctx.drawImage(this.glowSprite, l.x - gr, l.y - gr, gr * 2, gr * 2);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.55 + 0.3 * l.glow;
      ctx.fillStyle = '#f3dcff';
      for (let k = 0; k < 6; k++) {
        const ang = l.rot + k * TAU / 6;
        ctx.beginPath();
        ctx.ellipse(l.x + Math.cos(ang) * r0 * 0.55, l.y + Math.sin(ang) * r0 * 0.55 * 0.7, r0 * 0.55, r0 * 0.22, ang, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = '#ffe9c2';
      ctx.beginPath();
      ctx.arc(l.x, l.y, r0 * 0.28, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    a.particles.draw(ctx);
  }
}
