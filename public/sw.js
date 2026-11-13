const CACHE_NAME = 'werkplank-shell-v2';

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

  // Laat HTML-pagina's, API-calls en Next.js RSC-verzoeken altijd rechtstreeks via de browser lopen
  // zodat inloggen, uitloggen en wisselen van loge in Chrome direct ververst zonder cache-vertraging.
  const isStaticAsset =
    url.pathname === '/icon.svg' ||
    url.pathname === '/manifest.webmanifest' ||
    url.pathname.startsWith('/demo/') ||
    url.pathname.startsWith('/_next/static/');

  if (!isStaticAsset) return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
