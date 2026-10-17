// Breath engine: inhale I s, exhale E s, no holds, cosine-eased.
// b in [0,1]: 0 = empty (end of exhale), 1 = full (end of inhale).

export const PRESETS = [
  [3, 5], // easy
  [4, 6], // default, about 6 breaths/min
  [5, 7]  // slow
];
const ENTRY = [[4, 4], [4, 5]]; // gentle entry for the default preset

export class Breath {
  constructor(preset = 1) {
    this.preset = preset;
    this.inhale = true;
    this.phaseT = 0;
    this.p = 0;           // progress within the current phase, 0..1
    this.b = 0;
    this.cycle = 0;       // breaths started since launch
    this.completed = 0;   // full breaths completed
    this.handlers = { inhale: [], exhale: [] };
    this.entry = preset === 1;
  }

  on(name, fn) { this.handlers[name].push(fn); }

  emit(name) {
    const d = this.duration();
    for (const fn of this.handlers[name]) fn(d);
  }

  durations() {
    if (this.preset === 1 && this.entry && this.cycle < ENTRY.length) return ENTRY[this.cycle];
    return PRESETS[this.preset];
  }

  duration() {
    const [i, e] = this.durations();
    return this.inhale ? i : e;
  }

  // Change pace without a jump: keep the current phase progress.
  setPreset(index) {
    if (index === this.preset) return;
    this.preset = index;
    this.entry = false;
    this.phaseT = this.p * this.duration();
  }

  // Start again from an empty orb (used when the app becomes visible).
  start() {
    this.inhale = true;
    this.phaseT = 0;
    this.p = 0;
    this.b = 0;
    this.emit('inhale');
  }

  update(dt) {
    this.phaseT += dt;
    let d = this.duration();
    if (this.phaseT >= d) {
      this.phaseT -= d;
      if (this.inhale) {
        this.inhale = false;
        this.emit('exhale');
      } else {
        this.inhale = true;
        this.cycle++;
        this.completed++;
        this.emit('inhale');
      }
      d = this.duration();
      if (this.phaseT > d) this.phaseT = 0;
    }
    this.p = this.phaseT / d;
    const s = 0.5 - 0.5 * Math.cos(Math.PI * this.p);
    this.b = this.inhale ? s : 1 - s;
  }
}
