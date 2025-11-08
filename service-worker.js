const VERSION = 'pwa-v2';
const SHELL_CACHE = `${VERSION}-shell`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json'
];
const FONT_STYLESHEET = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
const FONT_HOSTS = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'];

self.addEventListener('install', event => {
  console.log('✅ Munkaóra PWA ready', VERSION);
  event.waitUntil(
    (async () => {
      const shellCache = await caches.open(SHELL_CACHE);
      await shellCache.addAll(APP_SHELL);
      await warmFontCaches(shellCache);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', event => {
  console.log('✅ Munkaóra PWA ready', VERSION);
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(key => key.startsWith('pwa-') && key !== SHELL_CACHE && key !== RUNTIME_CACHE)
          .map(key => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    return;
  }

  const { request } = event;
  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (FONT_HOSTS.includes(url.origin)) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
    return;
  }

  event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
});

async function warmFontCaches(shellCache) {
  try {
    const response = await fetch(FONT_STYLESHEET, { cache: 'no-cache' });
    if (!response || !response.ok) return;

    await shellCache.put(FONT_STYLESHEET, response.clone());
    const cssText = await response.text();
    const fontUrls = Array.from(cssText.matchAll(/url\(([^)]+)\)/g))
      .map(match => match[1].replace(/['"]/g, ''))
      .filter(url => url.startsWith('https://'));

    if (!fontUrls.length) return;

    const runtimeCache = await caches.open(RUNTIME_CACHE);
    await Promise.all(fontUrls.map(async fontUrl => {
      try {
        const fontResponse = await fetch(fontUrl, { cache: 'no-cache' });
        if (fontResponse && fontResponse.ok) {
          await runtimeCache.put(fontUrl, fontResponse.clone());
        }
      } catch (err) {
        console.warn('Font warmup failed for', fontUrl, err);
      }
    }));
  } catch (error) {
    console.warn('Font warmup skipped', error);
  }
}

function handleNavigation(request) {
  return fetch(request)
    .then(response => {
      const copy = response.clone();
      caches.open(SHELL_CACHE).then(cache => {
        cache.put(request, copy.clone()).catch(() => {});
        cache.put('./index.html', copy).catch(() => {});
      });
      return response;
    })
    .catch(() => caches.match(request)
      .then(match => match || caches.match('./index.html'))
    );
}

function staleWhileRevalidate(request, cacheName) {
  return caches.open(cacheName).then(cache =>
    cache.match(request).then(cachedResponse => {
      const fetchPromise = fetch(request)
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone()).catch(() => {});
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
}
