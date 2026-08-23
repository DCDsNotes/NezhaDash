/* Service Worker for static asset caching (CSS/fonts/images/icons)
 * - Avoid caching API calls under /api/
 * - Cache-first for static assets (hashed by Vite)
 * - Network-first for navigation documents
 */

const APP_BASE = new URL("./", self.location.href).pathname
const APP_INDEX = `${APP_BASE}index.html`
const CACHE_VERSION = "v16"
const CACHE_MAX_AGE = 30 * 24 * 60 * 60 * 1000
const CACHE_SCOPE = APP_BASE.replace(/[^a-z0-9]/gi, "_")
const STATIC_CACHE = `static-${CACHE_SCOPE}-${CACHE_VERSION}`
const ASSET_CACHE = `asset-${CACHE_SCOPE}-${CACHE_VERSION}`
const CACHE_PREFIXES = [`static-${CACHE_SCOPE}-`, `asset-${CACHE_SCOPE}-`]

function isSameOrigin(url) {
  return url.origin === self.location.origin
}

function isApiPath(url) {
  return url.pathname.startsWith("/api/")
}

function hasExpectedContentType(request, response) {
  const contentType = response.headers.get("content-type")?.toLowerCase() || ""
  if (request.destination === "style") return contentType.includes("text/css")
  if (request.destination === "script") return /javascript|ecmascript/.test(contentType)
  if (request.destination === "font") return /font|woff|octet-stream/.test(contentType)
  if (request.destination === "image") return contentType.startsWith("image/")
  return true
}

async function cachePut(cacheName, request, response) {
  try {
    if (!response || response.status !== 200 || !hasExpectedContentType(request, response)) return
    const cache = await caches.open(cacheName)
    const headers = new Headers(response.headers)
    headers.set("x-nezha-cached-at", String(Date.now()))
    // The Fetch body is already decoded. Do not retain transport headers that
    // would describe a different representation when replayed from Cache API.
    headers.delete("content-encoding")
    headers.delete("content-length")
    headers.delete("content-range")
    const body = await response.clone().arrayBuffer()
    await cache.put(
      request,
      new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      }),
    )
  } catch {
    // ignore
  }
}

function isFresh(response) {
  const cachedAt = Number(response?.headers.get("x-nezha-cached-at") || 0)
  return cachedAt > 0 && Date.now() - cachedAt < CACHE_MAX_AGE
}

function offlineResponse() {
  // Do not manufacture a successful-looking HTTP error for unavailable
  // resources. A cached app shell is preferred; if it is genuinely missing,
  // let the browser surface a normal network failure instead of a misleading
  // 504 response that looks like an API outage.
  return Response.error()
}

function appShellUrls(indexResponse) {
  const urls = new Set([APP_INDEX, APP_BASE, `${APP_BASE}manifest.json`, `${APP_BASE}icon.svg?v=10`])
  try {
    const html = indexResponse.clone()
    return html.text().then((source) => {
      for (const match of source.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
        const value = match[1]
        if (!value || value.startsWith("data:") || value.startsWith("//")) continue
        const url = new URL(value, self.location.href)
        if (isSameOrigin(url) && !isApiPath(url)) urls.add(`${url.pathname}${url.search}`)
      }
      return Array.from(urls)
    })
  } catch {
    return Promise.resolve(Array.from(urls))
  }
}

async function precacheAppShell(indexResponse) {
  const urls = await appShellUrls(indexResponse)
  await Promise.all(
    urls.map(async (path) => {
      const request = new Request(new URL(path, self.location.origin).toString())
      const response = path === APP_INDEX ? indexResponse.clone() : await safeFetch(request)
      if (response?.ok) await cachePut(STATIC_CACHE, request, response.clone())
    }),
  )
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
  if (cached && isFresh(cached)) return cached
  const response = await safeFetch(request)
  if (!response) return cached || offlineResponse()
  if (!hasExpectedContentType(request, response)) return response
  await cachePut(ASSET_CACHE, request, response.clone())
  return response
}

async function staleWhileRevalidate(request, event) {
  const cache = await caches.open(ASSET_CACHE)
  const cached = await cache.match(request, { ignoreSearch: false })
  const fetchPromise = safeFetch(request).then((response) => {
    if (response && hasExpectedContentType(request, response)) return cachePut(ASSET_CACHE, request, response.clone()).then(() => response)
    return response
  })

  if (cached && isFresh(cached)) {
    event.waitUntil(fetchPromise.then(() => undefined))
    return cached
  }

  return (await fetchPromise) || offlineResponse()
}

self.addEventListener("install", (event) => {
  self.skipWaiting()
  event.waitUntil(
    (async () => {
      const response = await safeFetch(APP_INDEX)
      if (!response?.ok) return
      await precacheAppShell(response)
    })(),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      const staleKeys = keys.filter((key) => CACHE_PREFIXES.some((prefix) => key.startsWith(prefix)) && !key.endsWith(CACHE_VERSION))
      await Promise.all(staleKeys.map((key) => caches.delete(key)))
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
  event.respondWith(staleWhileRevalidate(req, event))
})
