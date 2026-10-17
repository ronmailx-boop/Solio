// Solio service worker: precache everything, cache-first for assets,
// network-first for the page. Bump VERSION on every release.
const VERSION = 'solio-v4';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/main.js',
  './js/breath.js',
  './js/haptics.js',
  './js/ui.js',
  './js/orb.js',
  './js/sprites.js',
  './js/particles.js',
  './js/breathe.js',
  './js/sim.js',
  './js/scenes.js',
  './js/flow.js',
  './js/sand.js',
  './js/water.js',
  './js/audio.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/icon-monochrome-512.png',
  './icons/apple-touch-icon-180.png',
  './icons/favicon-32.png',
  './icons/favicon.ico'
];

// Hosts that redirect page.html -> /page hand back "redirected" responses,
// which browsers refuse to serve for navigations. Strip the flag.
async function unredirect(response) {
  if (!response.redirected) return response;
  return new Response(await response.blob(), {
    status: response.status, statusText: response.statusText, headers: response.headers
  });
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await Promise.all(ASSETS.map(async (url) => {
      const res = await fetch(url, { cache: 'reload' });
      if (!res.ok) throw new Error('precache ' + url);
      await cache.put(url, await unredirect(res));
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('solio-') && k !== VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(VERSION);
      try {
        const res = await unredirect(await fetch(req));
        if (res.ok) cache.put('./index.html', res.clone());
        return res;
      } catch (e) {
        return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    const res = await unredirect(await fetch(req));
    if (res.ok && res.type === 'basic') cache.put(req, res.clone());
    return res;
  })());
});
