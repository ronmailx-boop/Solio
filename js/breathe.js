// BREATHE: only the orb and its rings on near-black. No touch needed.

export class BreatheMode {
  constructor(app) {
    this.app = app;
    this.name = 'breathe';
  }

  enter() {}
  exit() {}
  step() {}
  update() {}
  down() {}
  move() {}
  up() {}

  render(ctx) {
    const a = this.app;
    ctx.fillStyle = a.bgDark;
    ctx.fillRect(0, 0, a.w, a.h);
    const x = a.w / 2;
    const y = a.h * (a.w > a.h ? 0.5 : 0.45);
    a.orbX = x;
    a.orbY = y;
    a.orb.draw(ctx, x, y, a.minDim, a.breath.b, a.c, 1.1, 1, 0, null, a.reduced);
  }
}
