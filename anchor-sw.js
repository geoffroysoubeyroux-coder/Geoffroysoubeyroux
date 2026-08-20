/* Anchor — service worker.
   Le code passe par le réseau d'abord (sinon une mise à jour reste invisible),
   les images par le cache. Hors ligne, tout retombe sur le cache. */
const CACHE = "anchor-app-2";
const FILES = ["./anchor.html", "./anchor.webmanifest",
               "./anchor-icon-192.png", "./anchor-icon-512.png", "./anchor-icon-maskable.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x))))
    .then(() => self.clients.claim()));
});

self.addEventListener("message", e => {
  if (e.data === "purge") {
    caches.keys().then(k => Promise.all(k.map(x => caches.delete(x))))
      .then(() => self.registration.unregister());
  }
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  const isCode = e.request.mode === "navigate"
    || /\.(html|js|webmanifest|css)$/.test(url.pathname)
    || url.pathname.endsWith("/");

  if (isCode) {
    /* Réseau d'abord : vous voyez toujours la dernière version en ligne. */
    e.respondWith(
      fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => caches.match(e.request).then(h => h || caches.match("./anchor.html")))
    );
  } else {
    /* Cache d'abord : les icônes ne changent pas. */
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }))
    );
  }
});
