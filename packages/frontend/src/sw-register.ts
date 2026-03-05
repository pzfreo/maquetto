/**
 * Register the service worker for WASM caching.
 * Call once from main.tsx on app startup.
 */
export function registerServiceWorker(): void {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch((err) => console.warn('SW registration failed:', err));
  }
}
