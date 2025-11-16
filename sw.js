// ============================================
// SERVICE WORKER v5.0 - AGRESSZÍV CACHE TÖRLÉS
// ============================================

importScripts('/version.js');

const VERSION = APP_VERSION;
const CACHE_NAME = `munkaora-v${VERSION}-${Date.now()}`; // TIMESTAMP!
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

// INSTALL - TÖRÖL MINDENT + CACHE ÚJ
self.addEventListener('install', (event) => {
  console.log(`[SW] 🆕 Installing v${VERSION}`);
  
  event.waitUntil(
    (async () => {
      try {
        // 1. TÖRÖLJÜK AZ ÖSSZES RÉGI CACHE-T
        const cacheNames = await caches.keys();
        console.log('[SW] 🗑️ Törlöm az összes cache-t:', cacheNames);
        await Promise.all(
          cacheNames.map(name => {
            console.log('[SW] Törlés:', name);
            return caches.delete(name);
          })
        );
        
        // 2. CACHE-ELJÜK AZ ÚJ FÁJLOKAT
        console.log('[SW] 📦 Új fájlok cache-elése...');
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll(urlsToCache);
        console.log('[SW] ✅ Cache kész:', CACHE_NAME);
        
        // 3. AZONNAL AKTIVÁLÓDJON
        await self.skipWaiting();
        console.log('[SW] ⚡ Skip waiting - azonnal aktiválódik');
      } catch (error) {
        console.error('[SW] ❌ Install hiba:', error);
      }
    })()
  );
});

// ACTIVATE - VEGYE ÁT A KONTROLLT + ÜZENJEN
self.addEventListener('activate', (event) => {
  console.log(`[SW] 🔥 Activating v${VERSION}`);
  
  event.waitUntil(
    (async () => {
      try {
        // 1. TÖRÖLJÜK A RÉGI CACHE-EKET
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME)
            .map(name => {
              console.log('[SW] 🗑️ Activate: törlöm', name);
              return caches.delete(name);
            })
        );
        
        // 2. VEGYE ÁT A KONTROLLT MINDEN CLIENT-EN
        await self.clients.claim();
        console.log('[SW] ✅ Clients claimed');
        
        // 3. ÜZENJEN MINDEN CLIENT-NEK
        const clients = await self.clients.matchAll({ type: 'window' });
        console.log(`[SW] 📢 Üzenetek küldése ${clients.length} client-nek`);
        
        clients.forEach(client => {
          client.postMessage({
            type: 'NEW_VERSION',
            version: VERSION,
            action: 'RELOAD'
          });
        });
        
        console.log('[SW] ✅ Activate kész');
      } catch (error) {
        console.error('[SW] ❌ Activate hiba:', error);
      }
    })()
  );
});

// FETCH - NETWORK FIRST az index.html-hez!
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip Supabase, Google Analytics
  if (
    url.hostname.includes('supabase') ||
    url.hostname.includes('google-analytics') ||
    url.hostname.includes('googletagmanager')
  ) {
    return;
  }

  // HTML, JS, CSS - MINDIG NETWORK FIRST (friss tartalom!)
  if (
    request.destination === 'document' ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css')
  ) {
    event.respondWith(
      fetch(request, { cache: 'no-cache' })
        .then(response => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Minden más - CACHE FIRST
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) {
        return cached;
      }
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

// MESSAGE - Verzió lekérdezés
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: VERSION });
  }
});

console.log(`[SW] 🚀 Service Worker v${VERSION} loaded`);
