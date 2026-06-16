const CACHE_NAME = "psicoconnect-static-v1";
const STATIC_ASSET_PATHS = [
  "/manifest.webmanifest",
  "/favicon.ico",
  "/favicon.png",
  "/logo.png",
  "/icon.png",
  "/apple-touch-icon.png",
  "/psicobot_icon_white.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSET_PATHS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      )
    )
  );

  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const requestUrl = new URL(request.url);

  if (requestUrl.origin !== self.location.origin) return;
  if (requestUrl.pathname.startsWith("/api/")) return;
  if (requestUrl.pathname.startsWith("/_next/data/")) return;
  if (request.headers.get("accept")?.includes("text/html")) return;

  const isStaticAsset =
    requestUrl.pathname.startsWith("/_next/static/") ||
    STATIC_ASSET_PATHS.includes(requestUrl.pathname) ||
    /\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|woff2?)$/i.test(
      requestUrl.pathname
    );

  if (!isStaticAsset) return;

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const networkResponse = fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }

          return response;
        })
        .catch(() => cachedResponse);

      return cachedResponse || networkResponse;
    })
  );
});
