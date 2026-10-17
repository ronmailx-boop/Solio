// Solio service worker: precache everything, cache-first for assets,
// network-first for the page. Bump VERSION on every release.
const VERSION = 'solio-v5';
// The demo video is cached on first play (not precached) in its own cache,
// which survives app updates. Bump MEDIA when the video changes.
const MEDIA = 'solio-media-1';
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
  './icons/favicon.ico',
  './media/solio-explainer.jpg'
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
    await Promise.all(keys.filter((k) => k.startsWith('solio-') && k !== VERSION && k !== MEDIA).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.endsWith('.mp4')) {
    event.respondWith(serveMedia(req, url));
    return;
  }

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

// Video players ask for byte ranges; answer them from the cached full file.
async function serveMedia(req, url) {
  const key = url.origin + url.pathname;
  const cache = await caches.open(MEDIA);
  let full = await cache.match(key);
  if (!full) {
    try {
      const res = await unredirect(await fetch(key));
      if (!res.ok || res.status !== 200) return res;
      await cache.put(key, res.clone());
      full = res;
    } catch (e) {
      return Response.error();
    }
  }
  const range = req.headers.get('range');
  if (!range) return full;
  const buf = await full.arrayBuffer();
  const size = buf.byteLength;
  const m = /bytes=(\d*)-(\d*)/.exec(range);
  let start = m && m[1] ? Number(m[1]) : 0;
  let end = m && m[2] ? Number(m[2]) : size - 1;
  if (m && !m[1] && m[2]) { start = Math.max(0, size - Number(m[2])); end = size - 1; }
  end = Math.min(end, size - 1);
  if (start > end) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': String(end - start + 1),
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Accept-Ranges': 'bytes'
    }
  });
}
