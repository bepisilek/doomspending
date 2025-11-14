// ============================================
// MUNKAÓRA PRO - SERVICE WORKER
// ============================================

// Verzió importálása
importScripts('version.js');

const CACHE_VERSION = `munkaora-v${APP_VERSION}`;
const CACHE_NAME = `${CACHE_VERSION}-static`;
const DATA_CACHE_NAME = `${CACHE_VERSION}-data`;

// Fájlok amit cache-elünk
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/version.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// ============================================
// INSTALL - Service Worker telepítése
// ============================================
self.addEventListener('install', (event) => {
  console.log('📦 Service Worker telepítés:', CACHE_VERSION);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('✅ Cache megnyitva');
        return cache.addAll(FILES_TO_CACHE);
      })
      .then(() => {
        // Azonnal aktiválódjunk
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('❌ Cache hiba:', err);
      })
  );
});

// ============================================
// ACTIVATE - Régi cache-ek törlése
// ============================================
self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker aktiválás:', CACHE_VERSION);
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Töröljük a régi cache-eket
          if(cacheName !== CACHE_NAME && cacheName !== DATA_CACHE_NAME){
            console.log('🗑️ Régi cache törlése:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Azonnal vegyük át az irányítást
      return self.clients.claim();
    })
  );
});

// ============================================
// FETCH - Hálózati kérések kezelése
// ============================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Csak a saját origin kéréseket kezeljük
  if(url.origin !== location.origin){
    return;
  }
  
  // SW.js, version.js - MINDIG FRISS (soha ne cache-elj)
  if(url.pathname === '/sw.js' || url.pathname === '/version.js'){
    event.respondWith(
      fetch(request, { cache: 'no-store' })
    );
    return;
  }
  
  // HTML fájlok: NETWORK FIRST (mindig friss)
  if(request.headers.get('accept') && request.headers.get('accept').includes('text/html')){
    event.respondWith(
      fetch(request, { cache: 'no-cache' })
        .then((response) => {
          // Cache-eljük a választ következő alkalomra
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // Ha nincs net, próbáljuk a cache-ből
          return caches.match(request);
        })
    );
    return;
  }
  
  // CSS, JS, képek: CACHE FIRST (gyors betöltés)
  event.respondWith(
    caches.match(request)
      .then((response) => {
        if(response){
          return response;
        }
        
        // Ha nincs cache-ben, töltsd le és cache-eld
        return fetch(request).then((response) => {
          // Csak a sikeres válaszokat cache-eljük
          if(!response || response.status !== 200 || response.type !== 'basic'){
            return response;
          }
          
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          
          return response;
        });
      })
  );
});

// ============================================
// MESSAGE - Üzenetek kezelése
// ============================================
self.addEventListener('message', (event) => {
  if(event.data && event.data.type === 'SKIP_WAITING'){
    console.log('⏩ skipWaiting aktiválva');
    self.skipWaiting();
  }
  
  // Cache manuális frissítése
  if(event.data && event.data.type === 'FORCE_UPDATE'){
    console.log('🔄 Cache kényszerített frissítése');
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      }).then(() => {
        return caches.open(CACHE_NAME).then((cache) => {
          return cache.addAll(FILES_TO_CACHE);
        });
      })
    );
  }
});

console.log('🚀 Service Worker betöltve:', CACHE_VERSION);
