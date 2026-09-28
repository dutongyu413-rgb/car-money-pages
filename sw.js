const CACHE_PREFIX = "car-money-pwa-";
const scopePath = new URL(self.registration.scope).pathname.replace(/\/$/, "");
const BASE_PATH = scopePath === "" ? "" : scopePath;
const CACHE_NAME = `${CACHE_PREFIX}v4:${BASE_PATH || "root"}`;

function scopedPath(path) {
  const absolutePath = path.startsWith("/") ? path : `/${path}`;
  if (!BASE_PATH) return absolutePath;
  return absolutePath === "/" ? `${BASE_PATH}/` : `${BASE_PATH}${absolutePath}`;
}

const APP_SHELL = [
  "/",
  "/projects/",
  "/projects/new/",
  "/project-detail/",
  "/interests/",
  "/funders/",
  "/vehicles/",
  "/settings/",
  "/projects/six-month-review/",
  "/manifest.webmanifest",
].map(scopedPath);

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  const scopePrefix = scopedPath("/");

  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    !url.pathname.startsWith(scopePrefix)
  ) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => (await caches.match(request)) || caches.match(scopedPath("/"))),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
