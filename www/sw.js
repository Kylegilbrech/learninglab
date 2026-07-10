/* Simple offline cache for the web/PWA build. Capacitor serves assets locally,
   so this mainly helps the browser/PWA version work offline. */
const CACHE = "gridiron-v3";
const ASSETS = [
  "./index.html",
  "./css/styles.css",
  "./js/teams.js",
  "./js/players.js",
  "./js/jerseys.js",
  "./js/avatars.js",
  "./js/confetti.js",
  "./js/app.js",
  "./manifest.webmanifest",
];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((hit) =>
      hit ||
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match("./index.html"))
    )
  );
});
