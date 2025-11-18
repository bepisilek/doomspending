// ============================================
// SERVICE WORKER v6.1 - INTELLIGENS VERZIÓKEZELÉS
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
    }).then(() => {
      console.log('[SW] Install complete, skipping waiting...');
      return self.skipWaiting();
    })
  );
});

// ACTIVATE - Régi cache-ek törlése + control átvétele
self.addEventListener('activate', event => {
  console.log(`[SW] Activating v${VERSION}`);

  event.waitUntil(
    caches.keys().then(keys => {
      // Ellenőrizzük, hogy valóban van-e régi cache
      const oldCaches = keys.filter(key => key !== CACHE_NAME);
      const hasOldCaches = oldCaches.length > 0;
      
      if (hasOldCaches) {
        console.log('[SW] Régi cache-ek találva:', oldCaches);
      } else {
        console.log('[SW] Nincsenek régi cache-ek');
      }
      
      return Promise.all(
        oldCaches.map(key => {
          console.log('[SW] Deleting old cache:', key);
          return caches.delete(key);
        })
      ).then(() => {
        // CSAK akkor küldjünk üzenetet, ha töröltünk régi cache-t (tehát új verzió van)
        if (hasOldCaches) {
          console.log('[SW] Új verzió aktiválva, értesítés küldése...');
          return notifyClients();
        } else {
          console.log('[SW] Első aktiválás vagy újraindítás, nincs értesítés');
        }
      });
    }).then(() => self.clients.claim())
  );
});

// Üzenet küldése minden tabnak
async function notifyClients() {
  const clients = await self.clients.matchAll({ 
    type: 'window',
    includeUncontrolled: true 
  });

  console.log(`[SW] Értesítés küldése ${clients.length} kliensnek...`);

  for (const client of clients) {
    try {
      client.postMessage({
        type: 'NEW_VERSION',
        version: VERSION
      });
      console.log('[SW] Üzenet elküldve:', client.id);
    } catch (error) {
      console.error('[SW] Üzenet küldési hiba:', error);
    }
  }
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

  // HTML, JS, CSS - network first (mindig friss verzió)
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
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Ha offline vagyunk, cache-ből szolgáljuk
          return caches.match(request);
        })
    );
    return;
  }

  // Minden más: cache first (gyorsabb betöltés)
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) {
        // Cache-ből szolgáljuk, de háttérben frissítjük
        fetch(request).then(response => {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, response);
            });
          }
        }).catch(() => {
          // Offline, nincs probléma
        });
        return cached;
      }

      // Nincs cache-ben, le kell tölteni
      return fetch(request).then(response => {
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          });
        }
        return response;
      });
    })
  );
});

// Verzió lekérdezés (ha a kliens kérdezi)
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: VERSION });
  }
  
  // Skip waiting parancs
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Skip waiting parancs fogadva');
    self.skipWa iting();
  }
});

console.log(`[SW] Loaded v${VERSION} 🚀`);
