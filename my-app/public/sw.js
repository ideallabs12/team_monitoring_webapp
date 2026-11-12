// ==============================================================================
// ALL-HANDS PWA SERVICE WORKER (sw.js)
// Enables Native Push Notifications on Lock Screen & Notification Center
// ==============================================================================

self.addEventListener('install', (event) => {
  // Activate worker immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim all active clients immediately
  event.waitUntil(self.clients.claim());
});

// Listen for incoming Push Notifications from Web Push Server (Apple APNs / Google FCM)
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'All-Hands Alert', body: event.data.text() };
    }
  }

  const title = data.title || 'All-Hands Notification';
  const options = {
    body: data.body || '',
    icon: data.icon || '/favicon_cropped.png',
    badge: data.badge || '/favicon_cropped.png',
    data: {
      url: data.url || '/home',
      timestamp: Date.now()
    },
    vibrate: [200, 100, 200],
    tag: data.tag || 'all-hands-push',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle Notification Clicks (Opening the target page)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/home';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a tab is already open, focus it and navigate
      for (const client of clientList) {
        if ('focus' in client) {
          if (client.url && client.url.includes(targetUrl)) {
            return client.focus();
          } else if ('navigate' in client) {
            return client.focus().then(() => client.navigate(targetUrl));
          }
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

