/* Cache publik saja. Tidak menyimpan halaman akun, RSC, API, atau respons Supabase. */
const CACHE = "santri-public-v1";
const PUBLIC = ["/offline.html", "/brand/logo-192.png", "/brand/logo-512.png"];
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        Promise.all(
          PUBLIC.map((path) =>
            cache.add(
              new Request(path, { cache: "reload", credentials: "omit" }),
            ),
          ),
        ),
      )
      .then(() => self.skipWaiting()),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("santri-public-") && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || event.request.mode !== "navigate")
    return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request).catch(() =>
      caches
        .open(CACHE)
        .then((cache) => cache.match("/offline.html"))
        .then(
          (response) =>
            response ||
            new Response(
              "Koneksi terputus. Sambungkan internet lalu muat ulang.",
              {
                status: 503,
                headers: { "Content-Type": "text/plain; charset=utf-8" },
              },
            ),
        ),
    ),
  );
});
