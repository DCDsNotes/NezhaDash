/* Service Worker for static asset caching (CSS/fonts/images/icons)
 * - Avoid caching API calls under /api/
 * - Cache-first for static assets (hashed by Vite)
 * - Network-first for navigation documents
 */

const CACHE_VERSION = "v1"
const STATIC_CACHE = `static-${CACHE_VERSION}`
const ASSET_CACHE = `asset-${CACHE_VERSION}`

function isSameOrigin(url) {
  return url.origin === self.location.origin
}

function isApiPath(url) {
  return url.pathname.startsWith("/api/")
}

async function cachePut(cacheName, request, response) {
  try {
    if (!response || response.status !== 200) return
    const cache = await caches.open(cacheName)
    await cache.put(request, response)
  } catch {
    // ignore
  }
}

async function networkFirst(request) {
  const cache = await caches.open(STATIC_CACHE)
  try {
    const response = await fetch(request)
    await cachePut(STATIC_CACHE, request, response.clone())
    return response
  } catch {
    const cached = await cache.match(request, { ignoreSearch: false })
    if (cached) return cached
    // fallback to cached index for SPA
    const index = await cache.match("/index.html")
    if (index) return index
    throw new Error("offline")
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(ASSET_CACHE)
  const cached = await cache.match(request, { ignoreSearch: false })
  if (cached) return cached
  const response = await fetch(request)
  await cachePut(ASSET_CACHE, request, response.clone())
  return response
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(ASSET_CACHE)
  const cached = await cache.match(request, { ignoreSearch: false })
  const fetchPromise = fetch(request)
    .then((response) => {
      cachePut(ASSET_CACHE, request, response.clone())
      return response
    })
    .catch(() => null)

  return cached || (await fetchPromise) || fetch(request)
}

self.addEventListener("install", (event) => {
  self.skipWaiting()
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE)
      await cache.addAll(["/", "/index.html"]).catch(() => {})
    })(),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => !k.endsWith(CACHE_VERSION)).map((k) => caches.delete(k)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener("fetch", (event) => {
  const req = event.request
  if (!req || req.method !== "GET") return

  const url = new URL(req.url)
  if (!isSameOrigin(url)) return
  if (isApiPath(url)) return

  // navigation (HTML)
  if (req.mode === "navigate") {
    event.respondWith(networkFirst(req))
    return
  }

  const dest = req.destination
  if (dest === "style" || dest === "script" || dest === "font" || dest === "image") {
    event.respondWith(cacheFirst(req))
    return
  }

  // everything else (e.g. svg imported as fetch)
  event.respondWith(staleWhileRevalidate(req))
})

