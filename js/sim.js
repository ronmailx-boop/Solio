// Sand and water cellular automaton on a low-resolution grid, plus its renderer.
// cell: 0 empty, 1 sand, 2 water. tone: low 4 bits jitter, bit 7 = raked groove.

export const EMPTY = 0, SAND = 1, WATER = 2;
const BANDS = 8;
const STRATA = 8;

export class Sim {
  constructor() {
    this.W = 0;
    this.H = 0;
    this.wind = 0;
    this.tick = 1;
    this.count = 0;
    this.landed = 0;
    this.wave = null; // { p, dur, dir }
    this.canvas = document.createElement('canvas');
    this.g = this.canvas.getContext('2d');
    this.glow = document.createElement('canvas');
    this.glowG = this.glow.getContext('2d');
    this.lut = new Uint32Array(BANDS * STRATA * 16);
    this.grooveLut = new Uint32Array(BANDS * 16);
    this.waterLut = new Uint32Array(BANDS * 16);
    this.waterTop = 0;
    this.frame = 0;
  }

  resize(vw, vh, W = 160) {
    const H = Math.max(40, Math.round(W * vh / vw));
    if (W === this.W && H === this.H) return false;
    this.W = W;
    this.H = H;
    const n = W * H;
    this.cell = new Uint8Array(n);
    this.tone = new Uint8Array(n);
    this.strat = new Uint8Array(n);
    this.vel = new Uint8Array(n);
    this.stamp = new Uint8Array(n);
    this.canvas.width = W;
    this.canvas.height = H;
    this.glow.width = Math.max(1, W >> 2);
    this.glow.height = Math.max(1, H >> 2);
    this.image = this.g.createImageData(W, H);
    this.px = new Uint32Array(this.image.data.buffer);
    // A grain crosses the screen in about 2.5 s at 30 Hz.
    this.maxV = Math.max(2, Math.round(H / 72));
    this.count = 0;
    this.wave = null;
    return true;
  }

  clear() {
    this.cell.fill(0);
    this.count = 0;
  }

  // palette: { strata: [[r,g,b] x8], water: [r,g,b], waterHi: [r,g,b], groove: [r,g,b] }
  setPalette(pal) {
    const pack = (r, g, b, a) => ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
    const cl = (v) => (v < 0 ? 0 : v > 255 ? 255 : v | 0);
    for (let band = 0; band < BANDS; band++) {
      const shade = 0.86 - 0.18 * band / (BANDS - 1);
      for (let s = 0; s < STRATA; s++) {
        const c = pal.strata[s % pal.strata.length];
        for (let t = 0; t < 16; t++) {
          const f = shade * (0.9 + 0.2 * t / 15);
          this.lut[(band * STRATA + s) * 16 + t] = pack(cl(c[0] * f), cl(c[1] * f), cl(c[2] * f), 255);
        }
      }
      for (let t = 0; t < 16; t++) {
        const f = shade * (0.92 + 0.16 * t / 15);
        const g = pal.groove;
        this.grooveLut[band * 16 + t] = pack(cl(g[0] * f), cl(g[1] * f), cl(g[2] * f), 255);
        const w = pal.water;
        const wf = (0.85 + 0.15 * t / 15) * (1.05 - 0.25 * band / (BANDS - 1));
        this.waterLut[band * 16 + t] = pack(cl(w[0] * wf), cl(w[1] * wf), cl(w[2] * wf), 150 + band * 8);
      }
    }
    const h = pal.waterHi;
    this.waterTop = pack(h[0], h[1], h[2], 170);
  }

  add(x, y, kind, stratum) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.W || y >= this.H) return false;
    const i = y * this.W + x;
    if (this.cell[i] !== EMPTY) return false;
    this.cell[i] = kind;
    this.tone[i] = (Math.random() * 16) | 0;
    this.strat[i] = stratum;
    this.vel[i] = 1;
    this.stamp[i] = 0;
    this.count++;
    return true;
  }

  // Gentle cleaning wave sweeping left to right.
  startWave(dur = 5) {
    if (this.wave) return false;
    this.wave = { p: 0, dur };
    return true;
  }

  get fill() { return this.count / (this.W * this.H); }

  move(i, j, tk) {
    const c = this.cell;
    c[j] = c[i]; this.tone[j] = this.tone[i]; this.strat[j] = this.strat[i]; this.vel[j] = this.vel[i];
    this.stamp[j] = tk;
    c[i] = EMPTY;
  }

  swap(i, j, tk) {
    const c = this.cell, t = this.tone, s = this.strat;
    let a = c[i]; c[i] = c[j]; c[j] = a;
    a = t[i]; t[i] = t[j]; t[j] = a;
    a = s[i]; s[i] = s[j]; s[j] = a;
    this.vel[i] = 1; this.vel[j] = 1;
    this.stamp[i] = tk; this.stamp[j] = tk;
  }

  step() {
    const { W, H, cell, stamp, vel } = this;
    const tk = this.tick = this.tick % 255 + 1;
    const ltr = (tk & 1) === 1;
    const wind = this.wind;
    const maxV = this.maxV;
    const pLeft = 0.5 - wind * 0.35;
    let landed = 0;

    for (let y = H - 1; y >= 0; y--) {
      const row = y * W;
      const last = y === H - 1;
      for (let k = 0; k < W; k++) {
        const x = ltr ? k : W - 1 - k;
        const i = row + x;
        const c = cell[i];
        if (c === EMPTY || stamp[i] === tk) continue;

        // Fall straight down, accelerating up to maxV cells per tick.
        if (!last && cell[i + W] === EMPTY) {
          let v = vel[i] + 1;
          if (v > maxV) v = maxV;
          let j = i, ny = y;
          for (let s = 0; s < v; s++) {
            const nj = j + W;
            if (ny + 1 >= H || cell[nj] !== EMPTY) break;
            j = nj; ny++;
          }
          vel[i] = v;
          this.move(i, j, tk);
          if (ny === H - 1 || cell[j + W] !== EMPTY) { vel[j] = 1; landed++; }
          continue;
        }
        if (last) {
          if (c === WATER) this.flow(x, i, tk, pLeft);
          continue;
        }
        const below = i + W;
        if (c === SAND && cell[below] === WATER) {
          if (Math.random() < 0.5) this.swap(i, below, tk);
          continue;
        }
        // Diagonals in random order, biased by tilt.
        const first = Math.random() < pLeft ? -1 : 1;
        let moved = false;
        for (let n = 0; n < 2 && !moved; n++) {
          const dx = n === 0 ? first : -first;
          const nx = x + dx;
          if (nx < 0 || nx >= W) continue;
          const j = below + dx;
          const cj = cell[j];
          if (cj === EMPTY) {
            if (c === SAND && cell[i + dx] !== EMPTY && Math.random() < 0.5) continue;
            vel[i] = 1;
            this.move(i, j, tk);
            moved = true;
          } else if (c === SAND && cj === WATER && Math.random() < 0.3) {
            this.swap(i, j, tk);
            moved = true;
          }
        }
        if (moved) continue;
        vel[i] = 1;
        if (c === WATER) this.flow(x, i, tk, pLeft);
      }
    }
    this.landed += landed;
    if (this.wave) this.stepWave();
  }

  // Water spreads sideways up to 3 cells, with slight viscosity.
  flow(x, i, tk, pLeft) {
    if (Math.random() > 0.85) return;
    const cell = this.cell, W = this.W;
    const dir = Math.random() < pLeft ? -1 : 1;
    for (let n = 0; n < 2; n++) {
      const d = n === 0 ? dir : -dir;
      let j = i, nx = x;
      for (let s = 0; s < 3; s++) {
        const tx = nx + d;
        if (tx < 0 || tx >= W || cell[j + d] !== EMPTY) break;
        nx = tx; j += d;
      }
      if (j !== i) { this.move(i, j, tk); return; }
    }
  }

  stepWave() {
    const w = this.wave;
    w.p += 1 / (30 * w.dur);
    const { W, H, cell } = this;
    // Eased front position, with a soft band behind it where grains dissolve.
    const e = w.p < 1 ? 0.5 - 0.5 * Math.cos(Math.PI * w.p) : 1;
    const front = e * (W + 24) - 12;
    const band = 14;
    const x0 = Math.max(0, Math.floor(front - band));
    const x1 = Math.min(W - 1, Math.floor(front));
    for (let x = 0; x <= x1; x++) {
      const prob = x < x0 ? 1 : 0.06 + 0.5 * (1 - (x - x0) / band);
      for (let y = 0; y < H; y++) {
        const i = y * W + x;
        if (cell[i] !== EMPTY && (prob >= 1 || Math.random() < prob)) {
          cell[i] = EMPTY;
          this.count--;
        }
      }
    }
    w.front = front / W;
    if (w.p >= 1) {
      this.clear();
      this.wave = null;
    }
  }

  // Draw into the low-res canvas; caller scales it up.
  render() {
    const { W, H, cell, tone, strat, px, lut, grooveLut, waterLut } = this;
    const bandDiv = H / BANDS;
    const wTop = this.waterTop;
    for (let y = 0; y < H; y++) {
      const band = Math.min(BANDS - 1, (y / bandDiv) | 0);
      const row = y * W;
      for (let x = 0; x < W; x++) {
        const i = row + x;
        const c = cell[i];
        if (c === EMPTY) { px[i] = 0; continue; }
        const t = tone[i];
        if (c === SAND) {
          px[i] = t & 0x80 ? grooveLut[band * 16 + (t & 15)] : lut[(band * STRATA + (strat[i] & 7)) * 16 + (t & 15)];
        } else {
          px[i] = y > 0 && cell[i - W] === EMPTY ? wTop : waterLut[band * 16 + (t & 15)];
        }
      }
    }
    this.g.putImageData(this.image, 0, 0);
    // Refresh the blurred glow copy a few times per second.
    if ((this.frame++ & 3) === 0) {
      this.glowG.clearRect(0, 0, this.glow.width, this.glow.height);
      this.glowG.imageSmoothingEnabled = true;
      this.glowG.drawImage(this.canvas, 0, 0, this.glow.width, this.glow.height);
    }
  }

  draw(ctx, w, h, glowAlpha = 0.25) {
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.canvas, 0, 0, w, h);
    if (glowAlpha > 0) {
      const prev = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = glowAlpha;
      ctx.drawImage(this.glow, 0, 0, w, h);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = prev;
    }
  }

  // Count filled cells within radius r of (cx, cy).
  countNear(cx, cy, r) {
    const { W, H, cell } = this;
    let n = 0;
    const r2 = r * r;
    for (let dy = -r; dy <= r; dy++) {
      const y = cy + dy;
      if (y < 0 || y >= H) continue;
      for (let dx = -r; dx <= r; dx++) {
        const x = cx + dx;
        if (x < 0 || x >= W || dx * dx + dy * dy > r2) continue;
        if (cell[y * W + x] !== EMPTY) n++;
      }
    }
    return n;
  }

  // Height (row index) of the top filled cell in column x, or H if empty.
  surface(x) {
    const { W, H, cell } = this;
    x = Math.max(0, Math.min(W - 1, x | 0));
    for (let y = 0; y < H; y++) if (cell[y * W + x] !== EMPTY) return y;
    return H;
  }
}
