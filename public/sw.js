/* eslint-disable no-restricted-globals */
/**
 * Minimal runtime cache for static assets (icons/fonts/images/styles).
 * Keeps refreshes fast even when the hosting server doesn't set long cache headers.
 */

const CACHE_NAME = 'nazhua-static-v1';
const CACHEABLE_DESTINATIONS = new Set(['style', 'font', 'image']);
const CACHEABLE_SUFFIXES = [
  '.css',
  '.woff2',
  '.woff',
  '.ttf',
  '.otf',
  '.eot',
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.ico',
];

function isCacheableRequest(request) {
  if (request.method !== 'GET') return false;
  if (CACHEABLE_DESTINATIONS.has(request.destination)) return true;
  try {
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return false;
    const path = url.pathname.toLowerCase();
    return CACHEABLE_SUFFIXES.some((s) => path.endsWith(s)) || path.includes('/assets/');
  } catch {
    return false;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res && res.ok) {
    cache.put(request, res.clone());
  }
  return res;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then((res) => {
    if (res && res.ok) {
      cache.put(request, res.clone());
    }
    return res;
  }).catch(() => cached);
  return cached || fetchPromise;
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => {
      if (key !== CACHE_NAME) {
        return caches.delete(key);
      }
      return null;
    }));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (!isCacheableRequest(request)) return;
  if (request.destination === 'style') {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
  event.respondWith(cacheFirst(request));
});
