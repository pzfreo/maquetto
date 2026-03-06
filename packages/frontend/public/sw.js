/**
 * Service worker for caching WASM and wheel files.
 * Cache-first strategy for Pyodide, OCP.wasm, and Build123d artifacts.
 * Second visit should reach engine-ready in 3-5 seconds.
 */

const CACHE_NAME = 'maquetto-wasm-v1';

const CACHE_PATTERNS = [
  'cdn.jsdelivr.net/pyodide/',
  'yeicor.github.io/OCP.wasm/',
  '.wasm',
  '.whl',
  '.so',
];

self.addEventListener('install', () => {
  console.log('[SW] Installing, skipping wait');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating, claiming clients');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  const shouldCache = CACHE_PATTERNS.some((p) => url.includes(p));

  if (!shouldCache) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        console.log('[SW] Cache hit:', url);
        return cached;
      }

      console.log('[SW] Cache miss, fetching:', url);
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(event.request, clone))
            .catch((err) => console.error('[SW] Cache write failed:', url, err));
        }
        return response;
      }).catch((err) => {
        console.error('[SW] Fetch failed:', url, err);
        throw err;
      });
    }),
  );
});
