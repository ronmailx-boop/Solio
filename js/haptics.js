// Breath-paced vibration. Pulses are scheduled from the frame loop so that
// light touch ticks can be interleaved without cancelling the breath pattern.

const MAX_PULSES = 64;

export class Haptics {
  constructor(enabled = true) {
    this.supported = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
    this.enabled = enabled;
    this.at = new Float64Array(MAX_PULSES);
    this.len = new Uint8Array(MAX_PULSES);
    this.count = 0;
    this.next = 0;
    this.lastPulse = 0;
    this.lastTick = 0;
  }

  vibrate(v) {
    if (!this.supported) return;
    // Browsers block vibration until the first tap; skip quietly until then.
    const ua = navigator.userActivation;
    if (ua && !ua.hasBeenActive) return;
    try { navigator.vibrate(v); } catch (e) { /* blocked before user activation */ }
  }

  // Build the pulse schedule for a phase of `dur` seconds.
  phase(inhale, dur, now) {
    this.count = 0;
    this.next = 0;
    if (!this.enabled || !this.supported) return;
    const total = dur * 1000;
    const limit = inhale ? total : total * 0.85; // silence for the final 15% of the exhale
    let t = 0;
    while (t < limit && this.count < MAX_PULSES) {
      const k = t / total;
      const q = inhale ? k : 1 - k;
      const len = 12 + 23 * q;    // 12 -> 35 ms
      const gap = 220 - 130 * q;  // 220 -> 90 ms
      this.at[this.count] = now + t;
      this.len[this.count] = len;
      this.count++;
      t += len + gap;
    }
  }

  update(now) {
    if (!this.enabled) return;
    while (this.next < this.count && this.at[this.next] <= now) {
      // Skip pulses we are late for (e.g. after a long frame).
      if (now - this.at[this.next] < 120) {
        this.vibrate(this.len[this.next]);
        this.lastPulse = now;
      }
      this.next++;
    }
  }

  // Light touch tick, at least 150 ms apart and away from breath pulses.
  tick(now, ms = 6) {
    if (!this.enabled || !this.supported) return;
    if (now - this.lastTick < 150 || now - this.lastPulse < 60) return;
    if (this.next < this.count && this.at[this.next] - now < 60) return;
    this.lastTick = now;
    this.vibrate(ms);
  }

  stop() {
    this.count = 0;
    this.next = 0;
    this.vibrate(0);
  }

  setEnabled(on) {
    this.enabled = on;
    if (!on) this.stop();
  }
}
