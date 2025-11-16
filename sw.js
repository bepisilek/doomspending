// ============================================
// SERVICE WORKER v6.0 - STABIL & KISZÁMÍTHATÓ
// ============================================

importScripts('/version.js');

const VERSION = APP_VERSION;
const CACHE_NAME = `munkaora-v${VERSION}`;

const URLS = [
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

// INSTALL - Új cache létrehozása
self.addEventListener('install', event => {
  console.log(`[SW] Installing v${VERSION}`);

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Precaching files...');
      return cache.addAll(URLS);
    }).then(() => self.skipWaiting())
  );
});

// ACTIVATE - Régi cache-ek törlése + control átvétele
self.addEventListener('activate', event => {
  console.log(`[SW] Activating v${VERSION}`);

  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => {
          console.log('[SW] Deleting old cache:', key);
          return caches.delete(key);
        })
      )
    ).then(() => self.clients.claim())
      .then(() => notifyClients())
  );
});

// Üzenet küldése minden tabnak
async function notifyClients() {
  const clients = await self.clients.matchAll({ type: 'window' });

  for (const client of clients) {
    client.postMessage({
      type: 'NEW_VERSION',
      version: VERSION
    });
  }

  console.log('[SW] Notified clients about new version');
}

// FETCH stratégia
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Külső API-kat nem cache-elünk
  if (url.hostname.includes('supabase') ||
      url.hostname.includes('google') ||
      url.hostname.includes('gtag')) {
    return;
  }

  // HTML, JS, CSS - network first
  if (
    request.destination === 'document' ||
    request.url.endsWith('.html') ||
    request.url.endsWith('.js') ||
    request.url.endsWith('.css')
  ) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Minden más: cache first
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) {
        return cached;
      }

      return fetch(request).then(response => {
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, responseClone));
        }
        return response;
      });
    })
  );
});

// Verzió lekérdezés
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: VERSION });
  }
});

console.log(`[SW] Loaded v${VERSION}`);
