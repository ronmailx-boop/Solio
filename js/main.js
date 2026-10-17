// Solio bootstrap: canvas, main loop, mode switching, input, persistence,
// wake lock, sensors and install prompt.
import { Breath } from './breath.js';
import { Haptics } from './haptics.js';
import { UI } from './ui.js';
import { Orb } from './orb.js';
import { Particles } from './particles.js';
import { BreatheMode } from './breathe.js';
import { FlowMode } from './flow.js';

const KEY = 'solio.v1';
const DEFAULTS = { sound: true, vib: true, pace: 1, mode: 'flow', unlocked: 1, active: 0, scene: 0, ghost: false };
const MODE_NAMES = ['flow', 'sand', 'water', 'breathe'];
const STEP = 1 / 30;

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { ...DEFAULTS, ...(s && typeof s === 'object' ? s : {}) };
  } catch (e) {
    return { ...DEFAULTS };
  }
}

const store = load();
if (!MODE_NAMES.includes(store.mode)) store.mode = 'flow';
store.pace = [0, 1, 2].includes(store.pace) ? store.pace : 1;

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* private mode */ }
}

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d', { alpha: false });
const reducedQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

const app = {
  canvas, ctx, store, save,
  w: 1, h: 1, minDim: 1, dpr: 1,
  breath: new Breath(store.pace),
  haptics: new Haptics(store.vib),
  orb: new Orb(),
  particles: new Particles(),
  audio: null,
  c: 0.25,          // coherence
  gentle: 0.7,      // smoothed finger gentleness
  wind: 0,          // tilt bias, -1..1
  windTarget: 0,
  reduced: !!(reducedQuery && reducedQuery.matches),
  pointers: new Map(),
  primary: null,
  lastTouch: 0,
  orbX: 0, orbY: 0,
  bg: '#0b0a1a',
  bgDark: '#08071a',
  sizeClass: '',
  onResize: [],
  shake: null
};
if (reducedQuery && reducedQuery.addEventListener) {
  reducedQuery.addEventListener('change', (e) => { app.reduced = e.matches; });
}

// ---------- modes ----------
const modes = {
  flow: new FlowMode(app),
  sand: new BreatheMode(app),
  water: new BreatheMode(app),
  breathe: new BreatheMode(app)
};
app.modes = modes;
let mode = null;
let modeName = '';
let rake = false;

function setMode(name) {
  if (name === modeName) {
    if (name === 'sand' && modes.sand.setRake) {
      rake = !rake;
      modes.sand.setRake(rake);
      ui.setMode(name, rake);
    }
    return;
  }
  if (mode) mode.exit();
  // Stop haptics and re-issue the current phase so pulses stay in step.
  app.haptics.stop();
  issuePhase();
  modeName = name;
  mode = modes[name];
  mode.enter();
  if (name !== 'breathe') { store.mode = name; save(); }
  ui.setMode(name, rake);
  if (app.audio) app.audio.setMode(name);
}

// ---------- UI ----------
let deferredInstall = null;
const standalone = () => (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;

const ui = new UI({
  mode: (m) => { userGesture(); setMode(m); },
  pace: () => {
    store.pace = (store.pace + 1) % 3;
    app.breath.setPreset(store.pace);
    ui.setPace(store.pace);
    issuePhase();
    save();
  },
  wave: () => { if (mode.wave) mode.wave(); },
  install: async () => {
    if (!deferredInstall) return;
    const ev = deferredInstall;
    deferredInstall = null;
    ui.setInstallable(false);
    try { await ev.prompt(); } catch (e) { /* ignore */ }
  },
  sound: () => {
    userGesture();
    store.sound = !store.sound;
    ui.setSound(store.sound);
    if (app.audio) app.audio.setEnabled(store.sound);
    save();
  },
  vibration: () => {
    store.vib = !store.vib;
    app.haptics.setEnabled(store.vib);
    ui.setVibration(store.vib, app.haptics.supported);
    if (store.vib) issuePhase();
    save();
  },
  scene: (i) => { if (mode.setScene) mode.setScene(i); }
});
app.ui = ui;
ui.setPace(store.pace);
ui.setSound(store.sound);
ui.setVibration(store.vib, app.haptics.supported);

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstall = e;
  ui.setInstallable(!standalone());
});
window.addEventListener('appinstalled', () => {
  deferredInstall = null;
  ui.setInstallable(false);
});

// ---------- breath events ----------
function issuePhase() {
  const b = app.breath;
  app.haptics.phase(b.inhale, b.duration(), performance.now() - b.phaseT * 1000);
}

let ringMark = 0;
app.breath.on('inhale', (d) => {
  app.haptics.phase(true, d, performance.now());
  if (mode && mode.onInhale) mode.onInhale(d);
});
app.breath.on('exhale', (d) => {
  app.haptics.phase(false, d, performance.now());
  app.orb.ring();
  ringMark = 1;
  if (mode && mode.onExhale) mode.onExhale(d);
});

// ---------- layout ----------
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  app.w = w;
  app.h = h;
  app.dpr = dpr;
  app.minDim = Math.min(w, h);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#0b0a1a');
  g.addColorStop(1, '#14112e');
  app.bg = g;
  const d = ctx.createLinearGradient(0, 0, 0, h);
  d.addColorStop(0, '#07060f');
  d.addColorStop(1, '#0b0a1a');
  app.bgDark = d;
  // Size class: orientation + coarse aspect bucket. Grids rebuild only when it changes.
  const cls = `${w > h ? 'l' : 'p'}${Math.round((Math.max(w, h) / Math.min(w, h)) * 4)}`;
  const changed = cls !== app.sizeClass;
  app.sizeClass = cls;
  for (const fn of app.onResize) fn(changed);
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));

// ---------- input ----------
let gestured = false;
function userGesture() {
  if (gestured) {
    if (app.audio) app.audio.resume();
    return;
  }
  gestured = true;
  if (app.audio) app.audio.unlock(store.sound);
  requestSensors();
  requestWakeLock();
}

function toLocal(e, p) {
  p.x = e.clientX;
  p.y = e.clientY;
  p.pressure = e.pressure && e.pointerType !== 'mouse' ? e.pressure : 0.5;
}

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  userGesture();
  ui.wake();
  ui.hideGhost();
  app.lastTouch = performance.now();
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  const p = { id: e.pointerId, x: 0, y: 0, x0: 0, y0: 0, vx: 0, vy: 0, speed: 0, pressure: 0.5, t0: e.timeStamp, lastT: e.timeStamp };
  toLocal(e, p);
  p.x0 = p.x; p.y0 = p.y;
  app.pointers.set(e.pointerId, p);
  app.primary = p;
  if (mode) mode.down(p);
});

canvas.addEventListener('pointermove', (e) => {
  const p = app.pointers.get(e.pointerId);
  if (!p) return;
  e.preventDefault();
  const px = p.x, py = p.y;
  toLocal(e, p);
  const dt = Math.max(0.001, (e.timeStamp - p.lastT) / 1000);
  p.lastT = e.timeStamp;
  const k = Math.min(1, dt / 0.12);
  const vx = (p.x - px) / dt, vy = (p.y - py) / dt;
  p.vx += (vx - p.vx) * k;
  p.vy += (vy - p.vy) * k;
  const inst = Math.hypot(vx, vy) / app.minDim;
  p.speed += (inst - p.speed) * k;
  app.lastTouch = performance.now();
  ui.wake();
  if (mode) mode.move(p, px, py);
});

function endPointer(e) {
  const p = app.pointers.get(e.pointerId);
  if (!p) return;
  app.pointers.delete(e.pointerId);
  if (app.primary === p) {
    app.primary = null;
    for (const q of app.pointers.values()) app.primary = q;
  }
  if (mode) mode.up(p, e.type === 'pointercancel');
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
window.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());

// ---------- wake lock ----------
let wakeLock = null;
async function requestWakeLock() {
  if (!gestured || document.hidden || wakeLock || !('wakeLock' in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } catch (e) {
    wakeLock = null;
  }
}

// ---------- sensors ----------
let sensorsOn = false;
let shakeHits = 0;
let shakeT = 0;
let shakeCool = 0;

function onOrientation(e) {
  if (e.gamma == null) return;
  const angle = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
  let tilt = e.gamma;
  if (angle === 90) tilt = -e.beta;
  else if (angle === -90 || angle === 270) tilt = e.beta;
  app.windTarget = Math.max(-1, Math.min(1, tilt / 30));
}

function onMotion(e) {
  const a = e.acceleration && e.acceleration.x != null ? e.acceleration : null;
  let m;
  if (a) m = Math.hypot(a.x || 0, a.y || 0, a.z || 0);
  else if (e.accelerationIncludingGravity) {
    const g = e.accelerationIncludingGravity;
    m = Math.abs(Math.hypot(g.x || 0, g.y || 0, g.z || 0) - 9.81);
  } else return;
  const now = performance.now();
  if (m > 15) {
    if (now - shakeT > 120) {
      shakeHits = now - shakeT < 900 ? shakeHits + 1 : 1;
      shakeT = now;
    }
    if (shakeHits >= 3 && now > shakeCool && !app.reduced) {
      shakeHits = 0;
      shakeCool = now + 2500;
      if (mode && mode.shake) mode.shake();
    }
  }
}

function attachSensors() {
  if (sensorsOn) return;
  sensorsOn = true;
  window.addEventListener('deviceorientation', onOrientation);
  window.addEventListener('devicemotion', onMotion);
}

function requestSensors() {
  try {
    const DO = window.DeviceOrientationEvent;
    const DM = window.DeviceMotionEvent;
    if (DO && typeof DO.requestPermission === 'function') {
      DO.requestPermission().then((r) => { if (r === 'granted') attachSensors(); }).catch(() => {});
      if (DM && typeof DM.requestPermission === 'function') DM.requestPermission().catch(() => {});
    } else {
      attachSensors();
    }
  } catch (e) { /* ignore */ }
}
// Where no permission is needed, listen right away.
try {
  if (!(window.DeviceOrientationEvent && typeof window.DeviceOrientationEvent.requestPermission === 'function')) attachSensors();
} catch (e) { /* ignore */ }

// ---------- visibility ----------
let paused = document.hidden;
let last = performance.now();
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    paused = true;
    app.haptics.stop();
    if (app.audio) app.audio.suspend();
    save();
  } else {
    paused = false;
    last = performance.now();
    issuePhase();
    if (app.audio && gestured) app.audio.resume();
    requestWakeLock();
    requestAnimationFrame(frame);
  }
});
window.addEventListener('pagehide', save);

// ---------- loop ----------
let acc = 0;
let skip = false;
let saveT = 0;
let ghostT = 0;
const unlockAt = (k) => 180 * k; // seconds for scene k (0-based)

function frame(now) {
  if (paused) return;
  requestAnimationFrame(frame);
  // Drop to 30 fps after a minute without touch.
  if (now - app.lastTouch > 60000) {
    skip = !skip;
    if (skip) return;
  }
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;

  const b = app.breath;
  b.update(dt);
  if (!b.inhale && ringMark < 3 && b.p >= ringMark / 3) { app.orb.ring(); ringMark++; }
  app.haptics.update(now);

  // Gentleness from finger speed; resting is calm.
  const p = app.primary;
  if (p && now - p.lastT > 60) p.speed *= Math.exp(-dt / 0.2);
  const target = p ? Math.max(0, Math.min(1, 1 - (p.speed - 0.25) / 1.1)) : 0.8;
  const tau = target > app.gentle ? 3 : 1.5;
  app.gentle += (target - app.gentle) * (1 - Math.exp(-dt / tau));
  const cTarget = 0.35 * Math.min(b.completed / 10, 1) + 0.65 * app.gentle;
  app.c += (cTarget - app.c) * (1 - Math.exp(-dt / 1.5));
  app.wind += (app.windTarget - app.wind) * (1 - Math.exp(-dt / 0.4));

  acc += dt;
  let steps = 0;
  while (acc >= STEP && steps < 3) { mode.step(); acc -= STEP; steps++; }
  if (steps === 3) acc = 0;

  mode.update(dt, now);
  app.orb.update(dt, app.reduced);
  mode.render(ctx);
  if (app.audio) app.audio.update(dt, app);

  ui.update(now, app.pointers.size === 0);

  // Active time and scene unlocks.
  store.active += dt;
  saveT += dt;
  if (saveT > 10) {
    saveT = 0;
    let u = store.unlocked;
    while (u < 4 && store.active >= unlockAt(u)) u++;
    if (u !== store.unlocked) {
      store.unlocked = u;
      if (mode.onUnlock) mode.onUnlock(u);
    }
    save();
  }

  // One-time ghost hand hinting "touch the orb".
  if (!store.ghost && (modeName === 'flow' || modeName === 'breathe')) {
    ghostT += dt;
    if (ghostT > 2.5 && app.lastTouch === 0) {
      store.ghost = true;
      save();
      ui.playGhost(app.orbX, app.orbY);
    }
  }
}

// ---------- start ----------
resize();
const params = new URLSearchParams(location.search);
const startMode = params.get('mode');
setMode(MODE_NAMES.includes(startMode) ? startMode : store.mode);
app.breath.start();
requestAnimationFrame((t) => { last = t; frame(t); });

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

export { app };
