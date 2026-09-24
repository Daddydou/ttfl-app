// Service worker minimaliste : rend l'app installable et met en cache la
// coquille statique (icônes, manifest). Il NE MET JAMAIS en cache les pages
// HTML ni les appels Supabase — les données doivent rester fraîches (fraîcheur
// d'avant-lock) et l'authentification ne doit jamais être servie depuis un cache.

const CACHE = "ttfl-shell-v1";
const SHELL = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // On ne touche qu'aux GET de notre propre origine.
  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  // Coquille statique : cache d'abord (rapide, hors-ligne).
  const isShell =
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest";

  if (isShell) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request)),
    );
    return;
  }

  // Tout le reste (pages, données) : réseau d'abord, sans mise en cache HTML.
  // On laisse passer tel quel : pas de fallback stale sur des pages authentifiées.
});

// Clic sur la notification "nouvelles projections" (NewRunNotifier) : ramène
// l'app au premier plan sur « Ce soir », ou l'ouvre si elle est fermée.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((wins) => {
        const win = wins.find((w) => new URL(w.url).origin === self.location.origin);
        if (win) return win.focus().then(() => win.navigate(url));
        return self.clients.openWindow(url);
      }),
  );
});
