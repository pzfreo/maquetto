/**
 * Service worker for caching WASM and wheel files.
 * Cache-first strategy for Pyodide, OCP.wasm, and Build123d artifacts.
 * Second visit should reach engine-ready in 3-5 seconds.
 */

const CACHE_NAME = 'maquette-wasm-v1';

const CACHE_PATTERNS = [
  'cdn.jsdelivr.net/pyodide/',
  'yeicor.github.io/OCP.wasm/',
  '.wasm',
  '.whl',
  '.so',
];

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  const shouldCache = CACHE_PATTERNS.some((p) => url.includes(p));

  if (!shouldCache) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    }),
  );
});
