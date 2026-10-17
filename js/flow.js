// FLOW: the orb fills on the inhale and pours a stream on the exhale.
// Grains build strata; buried stars wake when covered and form a constellation.
import { Sim, SAND, WATER } from './sim.js';
import { SCENES } from './scenes.js';
import { P } from './particles.js';
import { radialSprite, dotSprite } from './sprites.js';

const TAU = Math.PI * 2;
const SKY_DOTS = 46;

// Exhale emission curve: quick rise, long taper. Normalized to mean 1.
const bell = (p) => Math.pow(p, 0.6) * Math.pow(1 - p, 1.8);
const BELL_MEAN = (() => { let s = 0; for (let i = 0; i < 1000; i++) s += bell((i + 0.5) / 1000); return s / 1000; })();
const BELL_MAX = bell(0.6 / 2.4);

function waveBandSprite() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 1;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 64, 0);
  grad.addColorStop(0, 'rgba(160,190,255,0)');
  grad.addColorStop(0.7, 'rgba(190,210,255,0.16)');
  grad.addColorStop(0.92, 'rgba(235,240,255,0.22)');
  grad.addColorStop(1, 'rgba(235,240,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 1);
  return c;
}

export class FlowMode {
  constructor(app) {
    this.app = app;
    this.name = 'flow';
    this.sim = new Sim();
    this.scene = Math.min(app.store.scene | 0, Math.max(0, (app.store.unlocked | 0) - 1));
    this.stars = [];
    this.streamX = 0.5;
    this.emitAcc = 0;
    this.rateNorm = 0;
    this.time = 0;
    this.sinceWake = 0;
    this.complete = -1;      // seconds since the constellation completed, -1 if not
    this.pendingScene = -1;
    this.surpriseT = 30 + Math.random() * 40;
    this.shooting = null;
    this.fish = null;
    this.emberT = 0;
    this.plinkT = 0;
    this.checkT = 0;
    this.skyX = new Float32Array(SKY_DOTS);
    this.skyY = new Float32Array(SKY_DOTS);
    this.skyS = new Float32Array(SKY_DOTS);
    for (let i = 0; i < SKY_DOTS; i++) {
      this.skyX[i] = Math.random();
      this.skyY[i] = Math.random() * 0.45;
      this.skyS[i] = Math.random() * TAU;
    }
    this.starSprite = radialSprite(64, [[0, 'rgba(255,246,216,1)'], [0.18, 'rgba(255,246,216,0.75)'], [0.45, 'rgba(255,236,190,0.18)'], [1, 'rgba(255,236,190,0)']]);
    this.moonSprite = radialSprite(128, [[0, 'rgba(236,240,255,0.95)'], [0.32, 'rgba(220,228,255,0.85)'], [0.38, 'rgba(200,210,255,0.25)'], [1, 'rgba(180,190,255,0)']]);
    this.waveSprite = waveBandSprite();
    this.sky = null;
    app.onResize.push((changed) => this.resize(changed));
  }

  get def() { return SCENES[this.scene]; }

  resize(changed) {
    const a = this.app;
    const rebuilt = this.sim.resize(a.w, a.h);
    if (rebuilt || changed) this.placeStars();
    this.buildSky();
  }

  buildSky() {
    const a = this.app;
    const g = a.ctx.createLinearGradient(0, 0, 0, a.h);
    g.addColorStop(0, this.def.sky[0]);
    g.addColorStop(1, this.def.sky[1]);
    this.sky = g;
    const ag = a.ctx.createLinearGradient(0, 0, 0, a.h * 0.4);
    ag.addColorStop(0, 'rgba(120,255,200,0)');
    ag.addColorStop(0.45, 'rgba(120,255,200,0.5)');
    ag.addColorStop(1, 'rgba(160,110,255,0)');
    this.auroraGrad = ag;
  }

  applyScene() {
    const d = this.def;
    this.sim.setPalette(d);
    this.sim.clear();
    this.app.particles.clear();
    this.complete = -1;
    this.sinceWake = 0;
    this.fish = null;
    this.placeStars();
    this.buildSky();
    this.app.store.scene = this.scene;
    this.app.save();
    this.app.ui.setScenes(this.app.store.unlocked, this.scene);
  }

  placeStars() {
    const { W, H } = this.sim;
    if (!W) return;
    const n = Math.max(8, Math.min(12, Math.round(W * H / 5200)));
    const stars = [];
    let guard = 0;
    while (stars.length < n && guard++ < 2000) {
      const gx = 8 + Math.floor(Math.random() * (W - 16));
      const gy = Math.floor(H * (0.6 + Math.random() * 0.34));
      if (stars.some((s) => Math.hypot(s.gx - gx, (s.gy - gy) * 1.4) < 16)) continue;
      stars.push({ gx, gy, state: 0, n: 0, t: 0, x: 0, y: 0, tx: 0, ty: 0, seed: Math.random() * TAU, order: -1 });
    }
    // Sky targets: spread across the upper band, away from each other.
    const pts = [];
    guard = 0;
    while (pts.length < stars.length && guard++ < 3000) {
      const tx = 0.08 + Math.random() * 0.84;
      const ty = 0.05 + Math.random() * 0.17;
      if (pts.some((p) => Math.hypot(p[0] - tx, (p[1] - ty) * 2.2) < 0.13)) continue;
      pts.push([tx, ty]);
    }
    while (pts.length < stars.length) pts.push([Math.random(), 0.05 + Math.random() * 0.17]);
    // Order targets left to right so the constellation reads as one line.
    pts.sort((p, q) => p[0] - q[0]);
    stars.forEach((s, i) => { s.tx = pts[i][0]; s.ty = pts[i][1]; });
    this.stars = stars;
    this.woken = 0;
  }

  enter() {
    const a = this.app;
    if (!this.ready) {
      this.ready = true;
      this.sim.resize(a.w, a.h);
      this.applyScene();
    } else {
      this.buildSky();
      a.ui.setScenes(a.store.unlocked, this.scene);
    }
  }

  exit() {
    if (this.app.audio) this.app.audio.setGrain(0);
  }

  setScene(i) {
    if (i === this.scene && this.pendingScene < 0) return;
    if (i >= this.app.store.unlocked) return;
    this.pendingScene = i;
    this.app.ui.setScenes(this.app.store.unlocked, i);
    if (this.sim.count < 50) {
      this.scene = i;
      this.pendingScene = -1;
      this.applyScene();
    } else if (!this.sim.wave) {
      this.sim.startWave(4);
    }
  }

  onUnlock(u) {
    this.app.ui.setScenes(u, this.pendingScene >= 0 ? this.pendingScene : this.scene);
  }

  shake() { this.sim.startWave(5); }
  wave() { this.sim.startWave(5); }

  down(p) {
    this.app.haptics.tick(performance.now(), 8);
  }
  move() {}
  up() {}

  orbPos() {
    const a = this.app;
    return [a.w / 2, a.h * (a.w > a.h ? 0.32 : 0.29)];
  }

  step() {
    this.sim.wind = this.app.wind;
    const wasWave = !!this.sim.wave;
    this.sim.step();
    if (wasWave && !this.sim.wave) this.onWaveDone();

    // Wake stars that are covered by enough grains.
    if (++this.checkT >= 10) {
      this.checkT = 0;
      for (const s of this.stars) {
        if (s.state !== 0) continue;
        s.n = this.sim.countNear(s.gx, s.gy, 6);
        if (s.n >= 40) this.wakeStar(s);
      }
    }
  }

  onWaveDone() {
    if (this.pendingScene >= 0) {
      this.scene = this.pendingScene;
      this.pendingScene = -1;
      this.applyScene();
    } else if (this.complete >= 0) {
      this.scene = (this.scene + 1) % Math.max(1, this.app.store.unlocked);
      this.applyScene();
    }
  }

  wakeStar(s) {
    const a = this.app;
    const { W, H } = this.sim;
    s.state = 1;
    s.t = 0;
    s.order = this.woken++;
    s.x = (s.gx + 0.5) / W * a.w;
    s.y = (s.gy + 0.5) / H * a.h;
    s.sx = s.x; s.sy = s.y;
    this.sinceWake = 0;
    const n = a.reduced ? 4 : 10;
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * TAU;
      const sp = 8 + Math.random() * 18;
      a.particles.spawn(P.SPARKLE, s.x, s.y, Math.cos(ang) * sp, Math.sin(ang) * sp - 10, 1.6 + Math.random(), 3 + Math.random() * 3, 0);
    }
    if (a.audio) a.audio.chime(s.order);
  }

  update(dt, now) {
    const a = this.app;
    const b = a.breath;
    const sim = this.sim;
    this.time += dt;
    this.sinceWake += dt;

    // Stream position: follows the finger, or wanders slowly on its own.
    const p = a.primary;
    const target = p ? p.x / a.w : 0.5 + 0.26 * Math.sin(this.time * 0.11) + 0.1 * Math.sin(this.time * 0.29 + 1);
    this.streamX += (Math.max(0.03, Math.min(0.97, target)) - this.streamX) * (1 - Math.exp(-dt / 0.35));

    // Emission on the exhale.
    let rate = 0;
    if (!b.inhale && this.complete < 0 && !sim.wave) {
      const per = sim.W * 7;
      const f = bell(b.p) / BELL_MEAN;
      rate = per * f / b.duration();
      this.rateNorm = bell(b.p) / BELL_MAX;
    } else {
      this.rateNorm += (0 - this.rateNorm) * Math.min(1, dt * 4);
    }
    const scatter = p ? Math.max(0, Math.min(1, (p.speed - 0.35) / 1.2)) : 0;
    this.scatter = scatter;
    this.emitAcc += rate * dt;
    if (this.emitAcc >= 1) {
      const n = this.emitAcc | 0;
      this.emitAcc -= n;
      const d = this.def;
      const kind = d.material === 'water' ? WATER : d.material === 'mix' ? (b.cycle % 2 ? WATER : SAND) : SAND;
      const stratum = b.cycle & 7;
      const [, oy] = this.orbPos();
      const spawnRow = Math.floor((oy + a.orb.r + a.h * 0.05) / a.h * sim.H);
      const spread = 0.8 + scatter * 10;
      const cx = this.streamX * sim.W;
      for (let i = 0; i < n; i++) {
        sim.add(cx + (Math.random() - 0.5) * 2 * spread, spawnRow + Math.random() * 2, kind, stratum);
      }
    }
    this.spawnX = this.streamX * a.w;

    // Sparkles along a slow, gentle stream; spray when scribbling fast.
    if (this.rateNorm > 0.2) {
      const [, oy] = this.orbPos();
      const sy = oy + a.orb.r + a.h * 0.05;
      const chance = (a.reduced ? 0.15 : 0.5) * this.rateNorm * (0.3 + a.c);
      if (scatter < 0.25 && Math.random() < chance * a.gentle) {
        a.particles.spawn(P.SPARKLE, this.spawnX + (Math.random() - 0.5) * 8, sy + Math.random() * a.h * 0.2, (Math.random() - 0.5) * 6, 10 + Math.random() * 10, 1.2 + Math.random(), 2 + Math.random() * 2.5, this.def.starColor);
      }
      if (scatter > 0.4 && Math.random() < scatter * 0.6) {
        a.particles.spawn(P.SPRAY, this.spawnX, sy, (Math.random() - 0.5) * 120 * scatter, -10 - Math.random() * 30, 0.9, 2, 2);
      }
    }

    // Budget: too full, sweep it clean.
    if (sim.fill > 0.7) sim.startWave(6);

    // Landing ticks and water plinks.
    if (sim.landed > 0) {
      if (p) a.haptics.tick(now);
      if (this.def.material !== 'sand' && a.audio && this.time - this.plinkT > 0.35 && Math.random() < 0.25) {
        this.plinkT = this.time;
        a.audio.plink(Math.floor(Math.random() * 6), 0.18);
      }
      sim.landed = 0;
    }
    if (a.audio) a.audio.setGrain(this.def.material === 'water' ? this.rateNorm * 0.3 : this.rateNorm);

    // Stars rising to the sky.
    let allUp = this.stars.length > 0;
    for (const s of this.stars) {
      if (s.state === 1) {
        s.t += dt / 3.5;
        const e = s.t >= 1 ? 1 : 0.5 - 0.5 * Math.cos(Math.PI * s.t);
        const tx = s.tx * a.w, ty = s.ty * a.h;
        s.x = s.sx + (tx - s.sx) * e + Math.sin(s.t * Math.PI) * 30 * Math.sin(s.seed);
        s.y = s.sy + (ty - s.sy) * e;
        if (s.t >= 1) s.state = 2;
      }
      if (s.state !== 2) allUp = false;
    }
    if (allUp && this.complete < 0) {
      this.complete = 0;
      if (a.audio) a.audio.complete();
    }
    if (this.complete >= 0) {
      this.complete += dt;
      if (this.complete > 5 && !sim.wave) sim.startWave(7);
    }

    this.updateSurprises(dt);
  }

  updateSurprises(dt) {
    const a = this.app;
    const d = this.def;
    // Embers drift up from the sand in the Ember Garden.
    if (d.embers) {
      this.emberT -= dt;
      if (this.emberT <= 0) {
        this.emberT = a.reduced ? 1.6 : 0.6;
        const gx = Math.floor(Math.random() * this.sim.W);
        const top = this.sim.surface(gx);
        if (top < this.sim.H) {
          a.particles.spawn(P.EMBER, (gx + 0.5) / this.sim.W * a.w, top / this.sim.H * a.h, 0, -8 - Math.random() * 10, 5 + Math.random() * 4, 2 + Math.random() * 2, 4);
        }
      }
    }
    this.surpriseT -= dt;
    if (this.surpriseT <= 0) {
      this.surpriseT = 30 + Math.random() * 60;
      const r = Math.random();
      if (d.material !== 'sand' && r < 0.35 && !this.fish) this.startFish();
      else if (r < 0.65) this.startFireflies();
      else if (!this.shooting) this.shooting = { t: 0, x0: 0.1 + Math.random() * 0.4, y0: 0.04 + Math.random() * 0.1, dir: Math.random() < 0.5 ? 1 : -1 };
    }
    if (this.shooting) {
      this.shooting.t += dt / 2.4;
      if (this.shooting.t >= 1) this.shooting = null;
    }
    if (this.fish) {
      const f = this.fish;
      f.t += dt;
      f.x += f.v * dt;
      if (f.t > f.life) this.fish = null;
    }
  }

  startFireflies() {
    const a = this.app;
    const n = a.reduced ? 4 : 8;
    for (let i = 0; i < n; i++) {
      a.particles.spawn(P.FIREFLY, a.w * (0.1 + Math.random() * 0.8), a.h * (0.35 + Math.random() * 0.35), (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 6, 14 + Math.random() * 6, 3 + Math.random() * 2, 5);
    }
  }

  startFish() {
    // Find a row with water to swim through.
    const { W, H, cell } = this.sim;
    for (let tries = 0; tries < 20; tries++) {
      const gy = Math.floor(H * (0.7 + Math.random() * 0.25));
      const gx = Math.floor(W * 0.5);
      if (cell[gy * W + gx] === WATER) {
        const dir = Math.random() < 0.5 ? 1 : -1;
        const a = this.app;
        this.fish = { x: dir > 0 ? -30 : a.w + 30, y: (gy + 0.5) / H * a.h, v: dir * a.w / 9, dir, t: 0, life: 10 };
        return;
      }
    }
  }

  render(ctx) {
    const a = this.app;
    const { w, h } = a;
    const d = this.def;
    const t = this.time;
    ctx.fillStyle = this.sky || a.bg;
    ctx.fillRect(0, 0, w, h);

    // Faint background stars.
    ctx.fillStyle = '#fff6d8';
    for (let i = 0; i < SKY_DOTS; i++) {
      ctx.globalAlpha = 0.12 + 0.1 * Math.sin(t * 0.4 + this.skyS[i]);
      ctx.fillRect(this.skyX[i] * w, this.skyY[i] * h, 1.2, 1.2);
    }
    ctx.globalAlpha = 1;

    if (d.aurora) this.drawAurora(ctx, w, h, t);
    if (d.moon) {
      const r = a.minDim * 0.16;
      ctx.globalAlpha = 0.7;
      ctx.drawImage(this.moonSprite, w * 0.8 - r, h * 0.1 - r, r * 2, r * 2);
      ctx.globalAlpha = 1;
    }
    if (this.shooting) this.drawShooting(ctx, w, h);
    this.drawConstellation(ctx, w, h, t);

    // Terrain
    this.sim.render();
    this.sim.draw(ctx, w, h, 0.12 + 0.12 * a.c);
    if (this.fish) this.drawFish(ctx);
    if (this.sim.wave && this.sim.wave.front != null) {
      const fx = this.sim.wave.front * w;
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(this.waveSprite, fx - w * 0.22, 0, w * 0.24, h);
      ctx.globalCompositeOperation = 'source-over';
    }

    // Buried stars: barely visible twinkle; a hint after a quiet minute.
    let hint = null;
    if (this.sinceWake > 60) {
      for (const s of this.stars) if (s.state === 0 && (!hint || s.n > hint.n)) hint = s;
    }
    ctx.globalCompositeOperation = 'lighter';
    const { W, H } = this.sim;
    for (const s of this.stars) {
      if (s.state !== 0) continue;
      let al = 0.07 + 0.05 * Math.sin(t * 0.8 + s.seed);
      if (s === hint) al = 0.22 + 0.12 * Math.sin(t * 1.4);
      const x = (s.gx + 0.5) / W * w, y = (s.gy + 0.5) / H * h;
      const r = a.minDim * 0.03;
      ctx.globalAlpha = al;
      ctx.drawImage(this.starSprite, x - r, y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // Stream ribbon from the orb to the pour point.
    const [ox, oy] = this.orbPos();
    a.orbX = ox;
    a.orbY = oy;
    if (this.rateNorm > 0.02) {
      const sy = oy + a.orb.r + h * 0.05;
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = d.grain;
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.22 * this.rateNorm;
      ctx.lineWidth = (2 + this.scatter * 8) * (0.4 + 0.6 * this.rateNorm);
      ctx.beginPath();
      ctx.moveTo(ox, oy + a.orb.r * 0.75);
      ctx.quadraticCurveTo(ox, sy, this.spawnX, sy);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    a.orb.draw(ctx, ox, oy, a.minDim, a.breath.b, a.c, 1, 1, a.breath.b, d.grain, a.reduced);
    a.particles.draw(ctx);
  }

  drawAurora(ctx, w, h, t) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = this.auroraGrad;
    ctx.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      ctx.globalAlpha = 0.1 + 0.04 * Math.sin(t * 0.2 + k * 2);
      ctx.lineWidth = h * (0.05 + 0.02 * k);
      ctx.beginPath();
      for (let i = 0; i <= 14; i++) {
        const x = (i / 14) * (w + 80) - 40;
        const y = h * (0.12 + 0.05 * k) + Math.sin(x * 0.007 + t * 0.12 + k * 1.7) * h * 0.04 + Math.sin(x * 0.019 - t * 0.07) * h * 0.012;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  drawShooting(ctx, w, h) {
    const s = this.shooting;
    const e = s.t;
    const fade = Math.sin(Math.PI * e);
    const spr = dotSprite('#fff6d8');
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 10; i++) {
      const q = e - i * 0.012;
      if (q < 0) break;
      const x = (s.x0 + s.dir * q * 0.5) * w;
      const y = (s.y0 + q * 0.12) * h;
      const r = 4 - i * 0.3;
      ctx.globalAlpha = fade * 0.5 * (1 - i / 10);
      ctx.drawImage(spr, x - r, y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  drawConstellation(ctx, w, h, t) {
    // Stars are stored sorted by sky x, so consecutive awake stars form the line.
    const stars = this.stars;
    let up = 0;
    for (const s of stars) if (s.state === 2) up++;
    const done = this.complete >= 0 ? Math.min(1, this.complete / 3) : 0;
    if (up > 1) {
      ctx.strokeStyle = '#fff6d8';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.1 + 0.25 * done;
      ctx.beginPath();
      // When complete, the line draws itself across.
      const segs = up - 1;
      const limit = this.complete >= 0 ? done * segs : segs;
      let prev = null;
      let i = 0;
      for (const q of stars) {
        if (q.state !== 2) continue;
        if (prev) {
          if (i >= limit) break;
          const f = Math.min(1, limit - i);
          ctx.moveTo(prev.tx * w, prev.ty * h);
          ctx.lineTo(prev.tx * w + (q.tx - prev.tx) * w * f, prev.ty * h + (q.ty - prev.ty) * h * f);
          i++;
        }
        prev = q;
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.globalCompositeOperation = 'lighter';
    const r0 = this.app.minDim * 0.035;
    for (const s of this.stars) {
      if (s.state === 0) continue;
      const x = s.state === 2 ? s.tx * w : s.x;
      const y = s.state === 2 ? s.ty * h : s.y;
      const r = r0 * (1 + 0.5 * done) * (0.9 + 0.1 * Math.sin(t * 0.9 + s.seed));
      ctx.globalAlpha = 0.85;
      ctx.drawImage(this.starSprite, x - r, y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  drawFish(ctx) {
    const f = this.fish;
    const k = Math.min(1, f.t / 2, (f.life - f.t) / 2);
    const s = this.app.minDim * 0.045;
    ctx.save();
    ctx.translate(f.x, f.y + Math.sin(f.t * 1.2) * s * 0.3);
    ctx.scale(f.dir, 1);
    ctx.globalAlpha = 0.28 * k;
    ctx.fillStyle = '#1b1640';
    ctx.beginPath();
    ctx.ellipse(0, 0, s, s * 0.38, 0, 0, TAU);
    ctx.moveTo(-s * 0.8, 0);
    const wag = Math.sin(f.t * 3) * s * 0.12;
    ctx.lineTo(-s * 1.5, -s * 0.4 + wag);
    ctx.lineTo(-s * 1.5, s * 0.4 + wag);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
