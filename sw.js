const CACHE_NAME = 'werkplank-php-v3';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Alleen vaste statische bestanden cachen; PHP-pagina's lopen altijd rechtstreeks via de server.
  const isStaticAsset =
    url.pathname === '/icon.svg' ||
    url.pathname === '/manifest.webmanifest' ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/demo/');

  if (!isStaticAsset) return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
