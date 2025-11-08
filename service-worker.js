const CACHE_NAME = "munkaora-v1";
const URLS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => {
        console.log("✅ PWA online and installable");
        return self.clients.claim();
      })
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((response) =>
      response ||
      fetch(event.request).then((fetched) => {
        const copy = fetched.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return fetched;
      }).catch(() => caches.match("./index.html"))
    )
  );
});
