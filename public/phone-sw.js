const CACHE = "commonplace-phone-__VERSION__";
const PHONE = "/phone";

async function warm(paths = []) {
  const cache = await caches.open(CACHE);
  const response = await fetch(PHONE, { cache: "reload" });
  if (!response.ok || !response.headers.get("x-commonplace-phone"))
    throw new Error("Pair this device before preparing offline reading.");
  const html = await response.clone().text();
  const assets = [
    ...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"?]+(?:\?[^" ]*)?)"/g),
  ].map((match) => match[1]);
  const allowed = [
    ...new Set([
      ...assets,
      ...paths,
      "/manifest.webmanifest",
      "/icons/commonplace-180.png",
      "/icons/commonplace-192.png",
      "/icons/commonplace-512.png",
    ]),
  ]
    .map((path) => new URL(path, self.location.origin))
    .filter(
      (url) =>
        url.origin === self.location.origin &&
        (url.pathname.startsWith("/_next/static/") ||
          url.pathname.startsWith("/icons/") ||
          url.pathname === "/manifest.webmanifest"),
    );
  await Promise.all(
    allowed.map(async (url) => {
      const asset = await fetch(url, { cache: "reload" });
      if (!asset.ok) throw new Error("An offline asset could not be prepared.");
      await cache.put(url, asset);
    }),
  );
  await cache.put(PHONE, response);
}

self.addEventListener("install", (event) =>
  event.waitUntil(warm().then(() => self.skipWaiting())),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(
    caches.keys().then(async (keys) => {
      await Promise.all(
        keys
          .filter(
            (key) => key.startsWith("commonplace-phone-") && key !== CACHE,
          )
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    }),
  ),
);
self.addEventListener("message", (event) => {
  if (event.data?.type !== "CACHE_PHONE") return;
  event.waitUntil(
    warm(event.data.paths)
      .then(() => event.ports[0]?.postMessage({ ready: true }))
      .catch(async () => {
        const ready = Boolean(await (await caches.open(CACHE)).match(PHONE));
        event.ports[0]?.postMessage({ ready });
      }),
  );
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin)
    return;
  if (event.request.mode === "navigate" && url.pathname === PHONE) {
    event.respondWith(
      caches
        .open(CACHE)
        .then(
          async (cache) => (await cache.match(PHONE)) || fetch(event.request),
        ),
    );
    return;
  }
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/")
  ) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const saved = await cache.match(event.request);
        if (saved) return saved;
        const response = await fetch(event.request);
        if (response.ok) await cache.put(event.request, response.clone());
        return response;
      }),
    );
  }
  // API responses, credentials, pairing pages, and external sources are never cached.
});
