/* Marginalia service worker: versioned, cache-first, precaches every file so the book reads offline. */
const VERSION = 'marginalia-v2.0.1';
const FILES = [
  './',
  './index.html',
  './css/styles.css',
  './js/content.js',
  './js/app.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './fonts/cormorant-garamond-latin-500-italic.woff2',
  './fonts/cormorant-garamond-latin-500-normal.woff2',
  './fonts/cormorant-garamond-latin-600-normal.woff2',
  './fonts/courier-prime-latin-400-normal.woff2',
  './fonts/courier-prime-latin-700-normal.woff2',
  './fonts/la-belle-aurore-latin-400-normal.woff2',
  './fonts/lora-latin-400-italic.woff2',
  './fonts/lora-latin-400-normal.woff2',
  './fonts/lora-latin-600-normal.woff2',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(VERSION).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()));
    })
  );
});
