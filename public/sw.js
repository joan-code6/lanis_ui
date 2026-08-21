const CACHE_NAME = 'lanis-ui-shell-v2'
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
]

const isApiRequest = (url) =>
  url.pathname.startsWith('/api/')

const isStaticAsset = (url) =>
  /\.(js|css|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|eot)$/i.test(url.pathname)

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

self.addEventListener('push', (event) => {
  let data = {}
  if (event.data) {
    try {
      const parsed = event.data.json()
      data = parsed && typeof parsed === 'object' ? parsed : {}
    } catch {
      // Use the fallback notification content for malformed payloads.
    }
  }
  const title = data.title || 'Neue Nachricht in Lanis'
  const options = {
    body: data.body || 'Du hast neue Nachrichten.',
    icon: '/favicon/android-chrome-192x192.png',
    badge: '/favicon/favicon-32x32.png',
    tag: data.tag || 'lanis-messages',
    renotify: true,
    data: { url: data.url || '/messages' },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  let targetUrl
  try {
    const requestedUrl = new URL(
      event.notification.data?.url || '/messages',
      self.location.origin,
    )
    targetUrl = requestedUrl.origin === self.location.origin
      ? requestedUrl.href
      : new URL('/messages', self.location.origin).href
  } catch {
    targetUrl = new URL('/messages', self.location.origin).href
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clients) => {
      const target = new URL(targetUrl)
      for (const client of clients) {
        try {
          const clientUrl = new URL(client.url)
          if (
            clientUrl.origin === target.origin
            && clientUrl.pathname === target.pathname
            && clientUrl.search === target.search
          ) {
            return client.focus()
          }
        } catch {
          // Ignore an unusable client URL and continue to the next window.
        }
      }

      const activeClient = clients.find((client) => {
        try {
          return new URL(client.url).origin === self.location.origin
            && (client.focused || client.visibilityState === 'visible')
        } catch {
          return false
        }
      })
      if (activeClient && typeof activeClient.navigate === 'function') {
        try {
          await activeClient.navigate(targetUrl)
          return activeClient.focus()
        } catch {
          // Fall back to opening a new window when navigation is unavailable.
        }
      }
      return self.clients.openWindow(targetUrl)
    }),
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const { request } = event
  const requestUrl = new URL(request.url)

  if (isApiRequest(requestUrl)) return

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
        if (cachedResponse) return cachedResponse
        return OFFLINE_RESPONSE()
      }
    })())
    return
  }

  if (requestUrl.origin !== self.location.origin) return

  if (isStaticAsset(requestUrl)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse
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
        }).catch((error) => {
          console.error('Service worker fetch failed:', error)
          return OFFLINE_RESPONSE()
        })
      }),
    )
    return
  }

  event.respondWith(
    fetch(request).catch(async () => {
      const fallbackResponse = await caches.match('/index.html')
      if (fallbackResponse) return fallbackResponse
      return OFFLINE_RESPONSE()
    }),
  )
})
