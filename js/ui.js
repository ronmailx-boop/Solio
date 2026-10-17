// Icons, dock, top bar, scene dots, idle fading and the help sheet.

const svg = (body) => `<svg viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;

export const ICONS = {
  flow: svg('<circle cx="12" cy="8.5" r="5"/><path d="M12 15.6v.01M9.6 18v.01M14.4 18v.01M12 20.6v.01"/>'),
  sand: svg('<path d="M3 19.5h18"/><path d="M5 19.5c2-5 4.5-8 7-8s5 3 7 8"/><path d="M12 3.5v.01M12 7v.01"/>'),
  rake: svg('<path d="M12 3v10"/><path d="M5.5 13h13"/><path d="M5.5 13v6M9.8 13v6M14.2 13v6M18.5 13v6"/>'),
  water: svg('<path d="M12 3.5c1.7 2.1 2.5 3.4 2.5 4.6a2.5 2.5 0 0 1-5 0c0-1.2.8-2.5 2.5-4.6z"/><ellipse cx="12" cy="17" rx="3.2" ry="1.3"/><path d="M4.5 16.2c-.3.3-.5.5-.5.8 0 1.9 3.6 3.5 8 3.5s8-1.6 8-3.5c0-.3-.2-.5-.5-.8"/>'),
  breathe: svg('<circle cx="12" cy="12" r="2.6"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="9.5" opacity=".5"/>'),
  soundOn: svg('<path d="M4 9.5h3l4.5-4v13L7 14.5H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18.2 6.5a7.5 7.5 0 0 1 0 11"/>'),
  soundOff: svg('<path d="M4 9.5h3l4.5-4v13L7 14.5H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>'),
  vibOn: svg('<rect x="8" y="4" width="8" height="16" rx="2"/><path d="M4.8 9v6M19.2 9v6M2 10.8v2.4M22 10.8v2.4"/>'),
  vibOff: svg('<rect x="8" y="4" width="8" height="16" rx="2"/><path d="M3.5 3.5l17 17"/>'),
  install: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7.5v8M8.5 12.5l3.5 3.5 3.5-3.5"/>'),
  heart: svg('<path d="M12 20s-7.5-4.5-7.5-10.2A4.2 4.2 0 0 1 12 7.2a4.2 4.2 0 0 1 7.5 2.6C19.5 15.5 12 20 12 20z"/>'),
  pace: [
    svg('<path d="M2.5 12c1.2-2.6 2.4-2.6 3.6 0s2.4 2.6 3.6 0 2.4-2.6 3.6 0 2.4 2.6 3.6 0 2.4-2.6 3.6 0"/>'),
    svg('<path d="M3 12c1.5-3.4 3-3.4 4.5 0s3 3.4 4.5 0 3-3.4 4.5 0 3 3.4 4.5 0"/>'),
    svg('<path d="M3 12c2.25-4.4 4.5-4.4 6.75 0s4.5 4.4 6.75 0"/><path d="M16.5 12c1.5-2.9 3-3 4.5-1.6"/>')
  ],
  wave: svg('<path d="M2 15.5c2.5 0 3.5-2 6-2s3.5 2 6 2 3.5-2 6-2"/><path d="M2 19.5c2.5 0 3.5-2 6-2s3.5 2 6 2 3.5-2 6-2"/><path d="M7.5 10.5C7.5 7 10 4.5 13.5 4.5c1.6 0 2.8.5 3.8 1.4-2.2.1-3.6 1.6-3.6 3.6"/>'),
  phone: svg('<path d="M5 4h3.5l2 5-2.5 1.5a11 11 0 0 0 5.5 5.5l1.5-2.5 5 2v3.5a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>'),
  globe: svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/>'),
  hand: svg('<path d="M9 12V5.5a1.5 1.5 0 0 1 3 0V11m0-1.5a1.5 1.5 0 0 1 3 0V11m0-.5a1.5 1.5 0 0 1 3 0V11m0 0a1.5 1.5 0 0 1 3 0v4a6.5 6.5 0 0 1-6.5 6.5h-1.3a6 6 0 0 1-4.9-2.6L4.4 15a1.5 1.5 0 0 1 2.4-1.8L9 15.5"/>')
};

// Support lines. Every number was verified with a web search on 2026-10-17:
// ERAN 1201 (Israel), 988 Suicide & Crisis Lifeline (US) / 988 Suicide Crisis
// Helpline (Canada, live since 2023-11-30), Samaritans 116 123 (UK and Ireland),
// Lifeline 13 11 14 (Australia).
const LINES = [
  { regions: ['IL'], name: 'ERAN', num: '1201', tel: '1201' },
  { regions: ['US', 'CA'], name: '988', num: '988', tel: '988' },
  { regions: ['GB', 'IE'], name: 'Samaritans', num: '116 123', tel: '116123' },
  { regions: ['AU'], name: 'Lifeline', num: '13 11 14', tel: '131114' }
];

const TZ_REGION = [
  [/^Asia\/(Jerusalem|Tel_Aviv)$/, 'IL'],
  [/^Europe\/London$/, 'GB'],
  [/^Europe\/Belfast$/, 'GB'],
  [/^Europe\/Dublin$/, 'IE'],
  [/^Australia\//, 'AU'],
  [/^America\/(Toronto|Vancouver|Edmonton|Winnipeg|Halifax|St_Johns|Regina|Montreal|Moncton|Whitehorse|Yellowknife|Iqaluit)$/, 'CA'],
  [/^(America\/(New_York|Chicago|Denver|Los_Angeles|Phoenix|Anchorage|Detroit|Boise|Indiana|Kentucky|North_Dakota|Juneau|Sitka|Nome|Adak|Menominee)|Pacific\/Honolulu|US\/)/, 'US']
];

function detectRegions() {
  const found = [];
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    for (const [re, r] of TZ_REGION) if (re.test(tz)) { found.push(r); break; }
  } catch (e) { /* ignore */ }
  try {
    for (const tag of navigator.languages || [navigator.language]) {
      const m = /[-_]([A-Za-z]{2})\b/.exec(tag || '');
      if (m) { const r = m[1].toUpperCase(); if (!found.includes(r)) found.push(r); }
    }
  } catch (e) { /* ignore */ }
  return found;
}

function regionName(code) {
  try {
    return new Intl.DisplayNames([navigator.language || 'en'], { type: 'region' }).of(code) || code;
  } catch (e) {
    return code;
  }
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export class UI {
  constructor(handlers) {
    this.h = handlers;
    this.root = document.getElementById('ui');
    this.dock = document.getElementById('dock');
    this.scenesEl = document.getElementById('scenes');
    this.btn = {
      pace: document.getElementById('btn-pace'),
      wave: document.getElementById('btn-wave'),
      install: document.getElementById('btn-install'),
      sound: document.getElementById('btn-sound'),
      vib: document.getElementById('btn-vib'),
      help: document.getElementById('btn-help')
    };
    this.dim = document.getElementById('dim');
    this.backdrop = document.getElementById('sheet-backdrop');
    this.sheet = document.getElementById('sheet');
    this.ghost = document.getElementById('ghost');
    this.lastActive = performance.now();
    this.state = '';
    this.dimmed = false;
    this.rake = false;

    for (const b of this.dock.querySelectorAll('.mode')) {
      b.innerHTML = ICONS[b.dataset.mode];
      b.addEventListener('click', () => this.h.mode(b.dataset.mode));
    }
    this.btn.install.innerHTML = ICONS.install;
    this.btn.help.innerHTML = ICONS.heart;
    this.btn.wave.innerHTML = ICONS.wave;
    this.btn.pace.addEventListener('click', () => this.h.pace());
    this.btn.wave.addEventListener('click', () => this.h.wave());
    this.btn.install.addEventListener('click', () => this.h.install());
    this.btn.sound.addEventListener('click', () => this.h.sound());
    this.btn.vib.addEventListener('click', () => this.h.vibration());
    this.btn.help.addEventListener('click', () => this.openSheet());
    this.backdrop.addEventListener('click', (e) => { if (e.target === this.backdrop) this.closeSheet(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.closeSheet(); });
    this.scenesEl.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (b) this.h.scene(Number(b.dataset.i));
    });
  }

  setMode(mode, rake) {
    this.rake = rake;
    for (const b of this.dock.querySelectorAll('.mode')) {
      const on = b.dataset.mode === mode;
      b.classList.toggle('on', on);
      if (b.dataset.mode === 'sand') {
        b.innerHTML = rake ? ICONS.rake : ICONS.sand;
        b.setAttribute('aria-label', rake ? 'Rake' : 'Sand');
      }
      if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
    }
    this.btn.wave.hidden = mode !== 'sand';
    this.btn.pace.hidden = mode === 'sand';
    this.scenesEl.hidden = mode !== 'flow';
    this.mode = mode;
    this.wake();
  }

  setPace(i) { this.btn.pace.innerHTML = ICONS.pace[i]; }
  setSound(on) { this.btn.sound.innerHTML = on ? ICONS.soundOn : ICONS.soundOff; this.btn.sound.setAttribute('aria-pressed', String(on)); }
  setVibration(on, supported) {
    this.btn.vib.innerHTML = on ? ICONS.vibOn : ICONS.vibOff;
    this.btn.vib.setAttribute('aria-pressed', String(on));
    this.btn.vib.hidden = !supported;
  }
  setInstallable(on) { this.btn.install.hidden = !on; }

  setScenes(unlocked, current) {
    if (this.scenesEl.childElementCount !== unlocked) {
      let html = '';
      if (unlocked > 1) for (let i = 0; i < unlocked; i++) html += `<button type="button" data-i="${i}" aria-label="${i + 1}"></button>`;
      this.scenesEl.innerHTML = html;
    }
    let i = 0;
    for (const b of this.scenesEl.children) {
      b.classList.toggle('on', i === current);
      i++;
    }
  }

  // Any touch: bring the UI back.
  wake() {
    this.lastActive = performance.now();
    if (this.dimmed) { this.dimmed = false; this.dim.classList.remove('on'); }
    this.apply('');
  }

  apply(state) {
    if (state === this.state) return;
    this.state = state;
    this.root.classList.toggle('idle', state === 'idle');
    this.root.classList.toggle('hidden', state === 'hidden');
  }

  // Called a few times per second from the main loop.
  update(now, playing) {
    if (this.backdrop.hidden === false) return;
    const idle = now - this.lastActive;
    if (this.mode === 'breathe') {
      if (idle > 30000) {
        this.apply('hidden');
        if (!this.dimmed) { this.dimmed = true; this.dim.classList.add('on'); }
      } else if (idle > 4000) this.apply('idle');
    } else if (playing && idle > 4000) {
      this.apply('idle');
    }
  }

  playGhost(x, y) {
    this.ghost.innerHTML = ICONS.hand;
    this.ghost.style.left = `${x - 12}px`;
    this.ghost.style.top = `${y - 6}px`;
    this.ghost.classList.add('play');
    this.ghost.addEventListener('animationend', () => this.ghost.classList.remove('play'), { once: true });
  }

  hideGhost() { this.ghost.classList.remove('play'); }

  openSheet() {
    const regions = detectRegions();
    const lines = [];
    for (const r of regions) {
      for (const l of LINES) if (l.regions.includes(r) && !lines.some((x) => x.l === l)) lines.push({ l, r });
    }
    let html = `<div class="grab"></div><div class="heart">${ICONS.heart}</div><ul>`;
    for (const { l, r } of lines) {
      html += `<li><a href="tel:${esc(l.tel)}">${ICONS.phone}<span class="who"><b>${esc(regionName(r))}</b>${esc(l.name)}</span><span class="num">${esc(l.num)}</span></a></li>`;
    }
    html += `<li><a class="web" href="https://findahelpline.com" target="_blank" rel="noopener">${ICONS.globe}<span class="who">findahelpline.com</span></a></li></ul>`;
    this.sheet.innerHTML = html;
    this.backdrop.hidden = false;
    this.wake();
    const first = this.sheet.querySelector('a');
    if (first) first.focus({ preventScroll: true });
  }

  closeSheet() {
    if (this.backdrop.hidden) return;
    this.backdrop.hidden = true;
    this.btn.help.focus({ preventScroll: true });
    this.wake();
  }

  get sheetOpen() { return !this.backdrop.hidden; }
}
