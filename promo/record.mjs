// Records the Solio explainer video frames (1080x1920, 30 fps) from the real app.
// Time is virtual: each frame advances the app clock by exactly 1/30 s, so the
// output is smooth no matter how slow the screenshots are.
// Usage: node promo/record.mjs <app-url> <frames-dir>
import { createRequire } from 'module';
import fs from 'fs';

const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');

const URL_ = process.argv[2] || 'http://localhost:8080/Solio/';
const OUT = process.argv[3] || 'frames';
const FPS = 30;
const timeline = JSON.parse(fs.readFileSync(new URL('./timeline.json', import.meta.url)));
const TOTAL = timeline.total;
fs.mkdirSync(OUT, { recursive: true });

const VIRTUAL_CLOCK = () => {
  let now = 0;
  const q = [];
  const start = Date.now();
  performance.now = () => now;
  Date.now = () => start + now;
  window.requestAnimationFrame = (cb) => { q.push(cb); return q.length; };
  window.cancelAnimationFrame = () => {};
  Object.defineProperty(Event.prototype, 'timeStamp', { get() { return now; } });
  window.__advance = (ms) => { now += ms; const cbs = q.splice(0); for (const cb of cbs) cb(now); };
  try { localStorage.setItem('solio.v1', JSON.stringify({ ghost: true, mode: 'flow', unlocked: 1, scene: 0, active: 0, sound: true })); } catch (e) {}
};

const OVERLAY_CSS = `
  #ui.idle, #ui.hidden { opacity: 1 !important; }
  #cap { position: fixed; left: 18px; right: 18px; bottom: 112px; direction: rtl; text-align: center;
    font: 500 21px/1.45 "DejaVu Sans", "FreeSans", sans-serif; color: #f1ecff; opacity: 0;
    text-shadow: 0 1px 12px rgba(5,4,20,.95), 0 0 2px rgba(5,4,20,.9); pointer-events: none; }
  #cap span { background: rgba(11,10,26,.42); padding: 6px 14px; border-radius: 14px;
    -webkit-box-decoration-break: clone; box-decoration-break: clone; }
  #touch { position: fixed; width: 44px; height: 44px; margin: -22px 0 0 -22px; border-radius: 50%;
    border: 2px solid rgba(255,255,255,.55); background: rgba(255,255,255,.14);
    box-shadow: 0 0 18px rgba(203,188,255,.5); opacity: 0; pointer-events: none; }
  #brand { position: fixed; left: 0; right: 0; bottom: 104px; text-align: center; opacity: 0;
    font: 300 46px/1.2 "DejaVu Sans", sans-serif; letter-spacing: .12em; color: #e6ddff;
    text-shadow: 0 0 24px rgba(115,103,240,.8); pointer-events: none; }
`;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
await ctx.addInitScript(VIRTUAL_CLOCK);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(URL_);
await page.waitForFunction(() => typeof window.__advance === 'function');
await page.addStyleTag({ content: OVERLAY_CSS });
await page.evaluate(() => {
  document.body.insertAdjacentHTML('beforeend', '<div id="cap"></div><div id="touch"></div><div id="brand">Solio</div>');
});

const adv = (ms) => page.evaluate((m) => window.__advance(m), ms);
// Let the app boot and settle.
for (let i = 0; i < 10; i++) await adv(1000 / FPS);

// Warm-up off camera: a few breaths of sand so FLOW opens with strata.
await page.evaluate(async () => {
  const { app } = await import('./js/main.js');
  app.breath.setPreset(1);
  app.breath.entry = false;
});
for (let i = 0; i < 52 * FPS; i++) await page.evaluate((m) => window.__advance(m), 1000 / FPS);

// Prepare SAND (dunes for raking) and WATER (lotus lights), then set the breath phase:
// exhale 0.5-6.5 s, inhale 6.5-10.5 s, exhale 10.5-16.5 s, ...
await page.evaluate(async () => {
  const { app } = await import('./js/main.js');
  const sand = app.modes.sand;
  sand.enter();
  const s = sand.sim;
  for (let x = 0; x < s.W; x++) {
    const top = Math.floor(s.H * (0.4 + 0.035 * Math.sin(x / 17) + 0.02 * Math.sin(x / 7 + 1)));
    for (let y = top; y < s.H; y++) s.add(x, y, 1, Math.floor((y - top * 0.5) / 11) & 7);
  }
  app.modes.water.enter();
  const b = app.breath;
  b.inhale = true;
  b.phaseT = b.duration() - 0.5;
  app.particles.clear();
});

const segs = timeline.lines;
const capAt = (t) => {
  for (const l of segs) {
    if (t >= l.start - 0.25 && t <= l.end + 0.45) {
      const a = Math.min(1, (t - (l.start - 0.25)) / 0.35, (l.end + 0.45 - t) / 0.35);
      return { text: l.text, a: Math.max(0, a) };
    }
  }
  return { text: '', a: 0 };
};

// Scripted actions, in seconds of video time.
const W = 360, H = 640;
let pointerDown = false;
let modeNow = 'flow';
async function setMode(m) {
  if (modeNow === m) return;
  modeNow = m;
  await page.evaluate((mm) => document.querySelector(`.mode[data-mode="${mm}"]`).click(), m);
}
async function touch(x, y, down) {
  await page.evaluate(([tx, ty, on]) => {
    const el = document.getElementById('touch');
    el.style.left = tx + 'px'; el.style.top = ty + 'px'; el.style.opacity = on ? '1' : '0';
  }, [x, y, down]);
}
async function press(x, y) { await page.mouse.move(x, y); await page.mouse.down(); pointerDown = true; await touch(x, y, true); }
async function moveTo(x, y) { await page.mouse.move(x, y); await touch(x, y, true); }
async function release() { if (pointerDown) { await page.mouse.up(); pointerDown = false; await touch(0, 0, false); } }

let lastCap = '';
const frames = Math.round(TOTAL * FPS);
for (let f = 0; f < frames; f++) {
  const t = f / FPS;

  // 12.0-16.6: slow drag in FLOW, the stream follows the finger.
  if (t >= 12.0 && t < 16.6) {
    const k = (t - 12.0) / 4.6;
    const x = 70 + 220 * (0.5 - 0.5 * Math.cos(Math.PI * k));
    const y = 520 + 14 * Math.sin(k * 5);
    if (!pointerDown) await press(x, y); else await moveTo(x, y);
  } else if (t >= 16.6 && t < 17.2) await release();

  // 17.4: SAND, toggle to RAKE, then draw an arc (mirrored 8 times).
  if (t >= 17.4 && modeNow === 'flow') { await setMode('sand'); await page.evaluate(() => document.querySelector('.mode[data-mode="sand"]').click()); }
  if (t >= 17.7 && t < 19.9) {
    const k = (t - 17.7) / 2.2;
    const a = -0.4 + k * 1.9;
    const r = 118 - 70 * k;
    const x = W / 2 + Math.cos(a) * r, y = H / 2 + Math.sin(a) * r;
    if (!pointerDown) await press(x, y); else await moveTo(x, y);
  } else if (t >= 19.9 && t < 20.1) await release();

  // 20.1: WATER, a few calm taps and a slow drag.
  if (t >= 20.1 && modeNow === 'sand') await setMode('water');
  const taps = [[20.4, 120, 300], [20.9, 250, 380], [21.4, 160, 470]];
  for (const [tt, x, y] of taps) {
    if (Math.abs(t - tt) < 0.5 / FPS) await press(x, y);
    if (Math.abs(t - (tt + 0.2)) < 0.5 / FPS) await release();
  }
  if (t >= 21.7 && t < 22.0) await release();

  // 22.0: BREATHE.
  if (t >= 22.0 && modeNow === 'water') await setMode('breathe');

  const cap = capAt(t);
  const brand = t > 27.3 ? Math.min(1, (t - 27.3) / 0.6) : 0;
  await page.evaluate(([text, a, br, same]) => {
    const c = document.getElementById('cap');
    if (!same) c.innerHTML = text ? `<span>${text}</span>` : '';
    c.style.opacity = a;
    document.getElementById('brand').style.opacity = br;
  }, [cap.text, cap.a.toFixed(3), brand.toFixed(3), cap.text === lastCap]);
  lastCap = cap.text;

  await adv(1000 / FPS);
  await page.screenshot({ path: `${OUT}/f${String(f).padStart(4, '0')}.png` });
  if (f % 60 === 0) console.log('frame', f, '/', frames);
}
console.log('errors', JSON.stringify(errors));
await browser.close();
