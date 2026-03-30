self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    data = {
      title: 'Consultorio Dental',
      body: event.data ? event.data.text() : 'Tenes una nueva notificacion.',
    };
  }

  const title = data.title || 'Consultorio Dental';
  const options = {
    body: data.body || 'Tenes una nueva notificacion.',
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/badge-96x96.png',
    tag: data.tag || 'consultorio-alerta',
    requireInteraction: Boolean(data.requireInteraction),
    data: {
      url: data.url || '/',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notificationUrl =
    event.notification && event.notification.data && event.notification.data.url
      ? event.notification.data.url
      : '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          if ('navigate' in client) {
            client.navigate(notificationUrl);
          }
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(notificationUrl);
      }

      return undefined;
    })
  );
});
