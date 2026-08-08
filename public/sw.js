/* Service Worker for static asset caching (CSS/fonts/images/icons)
 * - Avoid caching API calls under /api/
 * - Cache-first for static assets (hashed by Vite)
 * - Network-first for navigation documents
 */

const APP_BASE = new URL("./", self.location.href).pathname
const APP_INDEX = `${APP_BASE}index.html`
const CACHE_VERSION = "v4"
const CACHE_SCOPE = APP_BASE.replace(/[^a-z0-9]/gi, "_")
const STATIC_CACHE = `static-${CACHE_SCOPE}-${CACHE_VERSION}`
const ASSET_CACHE = `asset-${CACHE_SCOPE}-${CACHE_VERSION}`

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

function offlineResponse() {
  return new Response("", {
    status: 504,
    statusText: "Network unavailable",
  })
}

async function safeFetch(request) {
  try {
    return await fetch(request)
  } catch {
    return null
  }
}

async function navigationNetworkFirst(request) {
  const cache = await caches.open(STATIC_CACHE)
  const response = await safeFetch(request)
  if (response?.ok) {
    await cachePut(STATIC_CACHE, request, response.clone())
    return response
  }
  if (response && response.status !== 404) return response

  const indexResponse = await safeFetch(APP_INDEX)
  if (indexResponse?.ok) {
    await cachePut(STATIC_CACHE, APP_INDEX, indexResponse.clone())
    return indexResponse
  }

  const cached = (await cache.match(request, { ignoreSearch: false })) || (await cache.match(APP_INDEX)) || (await cache.match(APP_BASE))
  return cached || response || offlineResponse()
}

async function cacheFirst(request) {
  const cache = await caches.open(ASSET_CACHE)
  const cached = await cache.match(request, { ignoreSearch: false })
  if (cached) return cached
  const response = await safeFetch(request)
  if (!response) return offlineResponse()
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

  const response = await fetchPromise
  return cached || response || offlineResponse()
}

self.addEventListener("install", (event) => {
  self.skipWaiting()
  event.waitUntil(
    (async () => {
      await Promise.all(
        [APP_BASE, APP_INDEX].map(async (url) => {
          const response = await safeFetch(url)
          if (response?.ok) await cachePut(STATIC_CACHE, url, response)
        }),
      )
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
    event.respondWith(navigationNetworkFirst(req))
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
