
const CACHE_NAME = 'mah-local-v1';

const APP_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// INSTALL
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

// ACTIVATE
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// OFFLINE CACHE
self.addEventListener('fetch', event => {
  if (
    event.request.method !== 'GET' ||
    new URL(event.request.url).origin !== self.location.origin
  ) return;

  event.respondWith(
    caches.match(event.request).then(cached =>
      cached ||
      fetch(event.request).then(response => {
        const copy = response.clone();

        caches.open(CACHE_NAME)
          .then(cache => cache.put(event.request, copy));

        return response;
      }).catch(() => caches.match('./index.html'))
    )
  );
});

// RECEIVE PUSH NOTIFICATION
self.addEventListener('push', event => {
  let payload = {};

  if (event.data) {
    try {
      payload = event.data.json();
    } catch (error) {
      payload = {
        body: event.data.text()
      };
    }
  }

  const title =
    payload.title || 'Migraine Awareness Hub';

  const options = {
    body: payload.body || 'You have a new notification.',
    icon: './icon-192.png',
    badge: './icon-192.png',
    data: {
      url: payload.url || './index.html'
    },
    renotify: false
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// CLICK NOTIFICATION
self.addEventListener('notificationclick', event => {
  event.notification.close();

  event.waitUntil(
    (async () => {
      let target = new URL(
        event.notification.data?.url || './index.html',
        self.location.origin
      );

      if (target.origin !== self.location.origin) {
        target = new URL('./index.html', self.location.origin);
      }

      const list = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      });

      for (const client of list) {
        if ('focus' in client) {
          await client.focus();

          if ('navigate' in client) {
            await client.navigate(target.href);
          }

          return;
        }
      }

      await self.clients.openWindow(target.href);
    })()
  );
});
