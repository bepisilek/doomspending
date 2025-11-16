// ============================================
// MUNKAÓRA PRO - SERVICE WORKER
// ============================================
// VERSION betöltése a version.js-ből (EGYETLEN forrás!)
importScripts('/version.js');
const version = APP_VERSION;

const CACHE_NAME = `munkaora-v${version}`;
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/version.js',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  '/icons/icon-512-maskable.svg',
  '/icons/apple-touch-icon.png'
];

// KRITIKUS: Azonnal aktiválódjon az új verzió
self.addEventListener('install', (event) => {
  console.log('[SW] Installing version:', version);
  
  event.waitUntil(
    (async () => {
      // ELŐSZÖR TÖRÖLJÜNK MINDEN RÉGI CACHE-T!
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
      
      // Utána cache-eljük az új fájlokat
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(urlsToCache);
      
      // AZONNAL aktiválódjon, ne várjon!
      await self.skipWaiting();
    })()
  );
});

// KRITIKUS: Azonnal vegye át a kontrollt
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating version:', version);
  
  event.waitUntil(
    (async () => {
      // Töröljünk minden cache-t ami nem a jelenlegi
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache during activate:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
      
      // AZONNAL vegye át a kontrollt minden kliensben
      await self.clients.claim();
      
      // Újratöltjük az összes klienst
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach(client => {
        client.postMessage({ type: 'FORCE_RELOAD' });
      });
    })()
  );
});

// Network First stratégia HTML-hez, Cache First máshoz
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Kihagyjuk a Supabase hívásokat
  if (url.hostname.includes('supabase')) {
    return;
  }

  // HTML fájlokhoz: MINDIG a hálózatról próbáljuk, cache csak ha offline
  if (request.destination === 'document' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Ha sikeres, cache-eljük
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // Ha nincs net, akkor cache-ből
          return caches.match(request);
        })
    );
    return;
  }

  // Minden máshoz: Cache First
  event.respondWith(
    caches.match(request).then(response => {
      if (response) {
        return response;
      }
      return fetch(request).then(response => {
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(request, responseToCache);
        });
        return response;
      });
    })
  );
});

// Verzió ellenőrzés üzenet
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version });
  }
});
