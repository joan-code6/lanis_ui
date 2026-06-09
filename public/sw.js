const CACHE_NAME = 'lanis-ui-shell-v1'
const OFFLINE_RESPONSE = () =>
  new Response('Offline', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: {
      'Content-Type': 'text/plain;charset=UTF-8',
    },
  })

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/favicon/site.webmanifest',
  '/favicon/favicon.ico',
  '/favicon/favicon-16x16.png',
  '/favicon/favicon-32x32.png',
  '/favicon/apple-touch-icon.png',
  '/favicon/android-chrome-192x192.png',
  '/favicon/android-chrome-512x512.png',
  '/icon.webp',
]

const logCacheError = (context, error) => {
  console.error(`Service worker cache failed for ${context}:`, error)
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch((error) => console.error('Service worker install failed:', error)),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName)),
      ),
    ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return
  }

  const { request } = event
  const requestUrl = new URL(request.url)

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request)
        event.waitUntil(
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put('/index.html', response.clone()))
            .catch((error) => logCacheError('/index.html', error)),
        )
        return response
      } catch {
        const cachedResponse = await caches.match('/index.html')
        if (cachedResponse) {
          return cachedResponse
        }

        return OFFLINE_RESPONSE()
      }
    })())
    return
  }

  if (requestUrl.origin !== self.location.origin) {
    return
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse
      }

      return fetch(request).then((response) => {
        if (response.ok) {
          event.waitUntil(
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(request, response.clone()))
              .catch((error) => logCacheError(request.url, error)),
          )
        }
        return response
      }).catch(async (error) => {
        console.error('Service worker fetch failed:', error)
        const fallbackResponse = await caches.match('/index.html')
        if (fallbackResponse) {
          return fallbackResponse
        }

        return OFFLINE_RESPONSE()
      })
    }),
  )
})
