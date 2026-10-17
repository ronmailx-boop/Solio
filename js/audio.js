// Synthesized sound: drone pad, breath wash, sand hiss, pentatonic bells.
// Created on the first touch (autoplay policy). Every gain change ramps.

const D_PENTA = [0, 2, 4, 7, 9];       // D major pentatonic
const D4 = 293.66;
const LEVEL = 0.5;
const TC = 0.05;                        // >= 30 ms ramps

function noiseBuffer(ctx, seconds, brown) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (brown) {
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    } else d[i] = w;
  }
  // Fade the loop seam.
  const f = Math.min(2048, len >> 2);
  for (let i = 0; i < f; i++) { const k = i / f; d[i] *= k; d[len - 1 - i] *= k; }
  return buf;
}

export function noteFreq(i) {
  const oct = Math.floor(i / 5);
  return D4 * Math.pow(2, (D_PENTA[((i % 5) + 5) % 5] + 12 * oct) / 12);
}

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.visible = true;
    this.grain = 0;
    this.acc = 0;
    this.suspendTimer = 0;
  }

  // Must be called from a user gesture.
  unlock(enabled) {
    this.enabled = enabled;
    if (enabled) this.ensure();
  }

  ensure() {
    if (this.ctx) { this.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
      this.build();
      this.resume();
    } catch (e) {
      this.ctx = null;
    }
  }

  build() {
    const c = this.ctx;
    const t = c.currentTime;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -20;
    comp.knee.value = 12;
    comp.ratio.value = 6;
    comp.attack.value = 0.01;
    comp.release.value = 0.3;
    comp.connect(c.destination);
    this.master = c.createGain();
    this.master.gain.setValueAtTime(0, t);
    this.master.connect(comp);

    // Simple feedback delay for space.
    this.delay = c.createDelay(1);
    this.delay.delayTime.value = 0.33;
    const fb = c.createGain();
    fb.gain.value = 0.34;
    const damp = c.createBiquadFilter();
    damp.type = 'lowpass';
    damp.frequency.value = 2200;
    this.delay.connect(damp);
    damp.connect(fb);
    fb.connect(this.delay);
    const wet = c.createGain();
    wet.gain.value = 0.4;
    damp.connect(wet);
    wet.connect(this.master);

    // Drone pad: D2 + A2 triangles, low-pass with a slow LFO.
    this.droneFilter = c.createBiquadFilter();
    this.droneFilter.type = 'lowpass';
    this.droneFilter.frequency.value = 600;
    this.droneFilter.Q.value = 0.4;
    const droneGain = c.createGain();
    droneGain.gain.value = 0.16;
    this.droneFilter.connect(droneGain);
    droneGain.connect(this.master);
    for (const [f, det] of [[73.42, -3], [110, 3]]) {
      const o = c.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f;
      o.detune.value = det;
      o.connect(this.droneFilter);
      o.start();
    }
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoAmt = c.createGain();
    lfoAmt.gain.value = 150;
    lfo.connect(lfoAmt);
    lfoAmt.connect(this.droneFilter.frequency);
    lfo.start();

    // Harmonics: richer with coherence.
    this.harm = c.createGain();
    this.harm.gain.value = 0;
    const harmLp = c.createBiquadFilter();
    harmLp.type = 'lowpass';
    harmLp.frequency.value = 1400;
    this.harm.connect(harmLp);
    harmLp.connect(this.master);
    for (const [f, g] of [[146.83, 0.5], [220, 0.35], [369.99, 0.18]]) {
      const o = c.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const og = c.createGain();
      og.gain.value = g;
      o.connect(og);
      og.connect(this.harm);
      o.start();
    }
    // Shimmer: high, soft, slowly breathing.
    this.shimmer = c.createGain();
    this.shimmer.gain.value = 0;
    const trem = c.createGain();
    trem.gain.value = 0.5;
    const tremLfo = c.createOscillator();
    tremLfo.frequency.value = 0.2;
    const tremAmt = c.createGain();
    tremAmt.gain.value = 0.5;
    tremLfo.connect(tremAmt);
    tremAmt.connect(trem.gain);
    tremLfo.start();
    for (const f of [1174.66, 1760]) {
      const o = c.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      o.connect(trem);
      o.start();
    }
    trem.connect(this.shimmer);
    this.shimmer.connect(this.master);
    this.shimmer.connect(this.delay);

    // Breath wash: brown noise through a band-pass that follows b(t).
    this.brown = noiseBuffer(c, 4, true);
    const wash = c.createBufferSource();
    wash.buffer = this.brown;
    wash.loop = true;
    this.washFilter = c.createBiquadFilter();
    this.washFilter.type = 'bandpass';
    this.washFilter.Q.value = 0.7;
    this.washFilter.frequency.value = 300;
    this.washGain = c.createGain();
    this.washGain.gain.value = 0;
    wash.connect(this.washFilter);
    this.washFilter.connect(this.washGain);
    this.washGain.connect(this.master);
    wash.start();

    // Sand: white noise, high-passed, gain follows the pour rate.
    const sand = c.createBufferSource();
    sand.buffer = noiseBuffer(c, 2, false);
    sand.loop = true;
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2000;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 7000;
    this.sandGain = c.createGain();
    this.sandGain.gain.value = 0;
    sand.connect(hp);
    hp.connect(lp);
    lp.connect(this.sandGain);
    this.sandGain.connect(this.master);
    sand.start();
  }

  get live() { return !!this.ctx && this.enabled && this.visible && this.ctx.state === 'running'; }

  resume() {
    if (!this.ctx || !this.enabled || !this.visible) return;
    clearTimeout(this.suspendTimer);
    const c = this.ctx;
    const go = () => this.master.gain.setTargetAtTime(LEVEL, c.currentTime, 0.6); // ~2 s fade in
    if (c.state !== 'running') c.resume().then(go).catch(() => {});
    else go();
  }

  fadeOutAndSuspend() {
    if (!this.ctx) return;
    const c = this.ctx;
    this.master.gain.setTargetAtTime(0, c.currentTime, 0.08);
    clearTimeout(this.suspendTimer);
    this.suspendTimer = setTimeout(() => { if (!this.enabled || !this.visible) c.suspend().catch(() => {}); }, 450);
  }

  suspend() {
    this.visible = false;
    this.fadeOutAndSuspend();
  }

  wake() {
    this.visible = true;
    this.resume();
  }

  setEnabled(on) {
    this.enabled = on;
    if (on) this.ensure();
    else this.fadeOutAndSuspend();
  }

  setMode() {}

  setGrain(v) { this.grain = v; }

  update(dt, app) {
    if (!this.live) return;
    this.acc += dt;
    if (this.acc < 0.05) return;
    this.acc = 0;
    const t = this.ctx.currentTime;
    const b = app.breath.b;
    const c = app.c;
    this.washFilter.frequency.setTargetAtTime(260 + 620 * b, t, 0.12);
    this.washGain.gain.setTargetAtTime(0.025 + 0.075 * b, t, 0.12);
    this.harm.gain.setTargetAtTime(0.05 * Math.max(0, c - 0.25), t, 0.6);
    this.shimmer.gain.setTargetAtTime(0.012 * Math.max(0, c - 0.45) * 2, t, 0.8);
    this.droneFilter.frequency.setTargetAtTime(450 + 350 * c, t, 0.8);
    this.sandGain.gain.setTargetAtTime(0.045 * Math.min(1, this.grain), t, TC);
  }

  bell(freq, vol, decay, when = 0, send = 0.6) {
    if (!this.live) return;
    const c = this.ctx;
    const t = c.currentTime + when;
    const env = c.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(vol, t + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    const o1 = c.createOscillator();
    o1.type = 'sine';
    o1.frequency.value = freq;
    const o2 = c.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = freq * 2.76;
    const g2 = c.createGain();
    g2.gain.value = 0.18;
    o1.connect(env);
    o2.connect(g2);
    g2.connect(env);
    env.connect(this.master);
    if (send) {
      const s = c.createGain();
      s.gain.value = send;
      env.connect(s);
      s.connect(this.delay);
    }
    o1.start(t); o2.start(t);
    o1.stop(t + decay + 0.1); o2.stop(t + decay + 0.1);
    return o1;
  }

  note(i, vol = 0.3) { this.bell(noteFreq(i), vol * 0.5, 3.2); }
  plink(i, vol = 0.2) { this.bell(noteFreq(i + 5), vol * 0.35, 1.4); }

  chime(order) {
    const i = 5 + (order % 5);
    this.bell(noteFreq(i), 0.14, 3.5);
    this.bell(noteFreq(i + 2), 0.07, 3.5, 0.18);
  }

  pebble() {
    if (!this.live) return;
    const o = this.bell(noteFreq(-5), 0.22, 2.2, 0, 0.4);
    if (o) o.frequency.setValueAtTime(170, this.ctx.currentTime);
    if (o) o.frequency.exponentialRampToValueAtTime(140, this.ctx.currentTime + 0.35);
  }

  // Constellation complete: a slow swell with an added third, plus a wave of noise.
  complete() {
    if (!this.live) return;
    const c = this.ctx;
    const t = c.currentTime;
    const env = c.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.06, t + 2.2);
    env.gain.setTargetAtTime(0, t + 3.5, 1.2);
    env.connect(this.master);
    env.connect(this.delay);
    for (const f of [D4, D4 * 1.2599, D4 * 1.4983]) {
      const o = c.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      o.connect(env);
      o.start(t);
      o.stop(t + 9);
    }
    const n = c.createBufferSource();
    n.buffer = this.brown;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(300, t);
    lp.frequency.linearRampToValueAtTime(900, t + 3);
    lp.frequency.linearRampToValueAtTime(250, t + 7);
    const ng = c.createGain();
    ng.gain.setValueAtTime(0, t);
    ng.gain.linearRampToValueAtTime(0.09, t + 3);
    ng.gain.linearRampToValueAtTime(0, t + 7.5);
    n.connect(lp);
    lp.connect(ng);
    ng.connect(this.master);
    n.start(t);
    n.stop(t + 8);
  }
}
