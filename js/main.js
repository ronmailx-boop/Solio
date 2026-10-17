// Solio bootstrap (shell).
const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');

function draw() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth, h = window.innerHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#0b0a1a');
  g.addColorStop(1, '#14112e');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const r = Math.min(w, h) * 0.22;
  const o = ctx.createRadialGradient(w / 2, h * 0.42, 0, w / 2, h * 0.42, r);
  o.addColorStop(0, '#ffffff');
  o.addColorStop(0.35, '#cbbcff');
  o.addColorStop(0.75, '#7367f0');
  o.addColorStop(1, 'rgba(115,103,240,0)');
  ctx.fillStyle = o;
  ctx.beginPath();
  ctx.arc(w / 2, h * 0.42, r, 0, Math.PI * 2);
  ctx.fill();
}
draw();
window.addEventListener('resize', draw);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
