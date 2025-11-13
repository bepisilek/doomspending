const CACHE_VERSION = 'munkaora-v2.8.0';
const APP_SHELL = [
  './',
  './index.html',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  console.log('[SW] Installing version:', CACHE_VERSION);
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      console.log('[SW] Caching app shell');
      return cache.addAll(APP_SHELL);
    })
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating version:', CACHE_VERSION);
  event.waitUntil(
    caches.keys().then((keys) => {
      console.log('[SW] Found caches:', keys);
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      );
    }).then(() => {
      console.log('[SW] Claiming clients');
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') {
    return;
  }
  
  const requestURL = new URL(request.url);
  
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => {
            cache.put(request, copy);
          }).catch(() => {});
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }
  
  if (requestURL.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          fetch(request).then((response) => {
            if (response && response.status === 200) {
              const copy = response.clone();
              caches.open(CACHE_VERSION).then((cache) => {
                cache.put(request, copy);
              }).catch(() => {});
            }
          }).catch(() => {});
          return cachedResponse;
        }
        
        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => {
              cache.put(request, copy);
            }).catch(() => {});
          }
          return response;
        });
      })
    );
  }
});
