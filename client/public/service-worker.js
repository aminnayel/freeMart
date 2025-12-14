const CACHE_NAME = "khudar-fakha-v1";
const RUNTIME_CACHE = "khudar-fakha-runtime-v1";
const URLS_TO_CACHE = [
  "/",
  "/index.html",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(URLS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip chrome extensions
  if (url.protocol === "chrome-extension:") {
    return;
  }

  // Skip API calls - let them go through network
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // For HTML, CSS, JS - try network first, then cache
  if (
    request.headers.get("accept")?.includes("text/html") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css")
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone immediately before any other operations
          if (response.ok) {
            const responseToCache = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then(response => {
            return response || caches.match("/");
          });
        })
    );
    return;
  }

  // For everything else - cache first, then network
  event.respondWith(
    caches.match(request).then((response) => {
      if (response) {
        return response;
      }

      return fetch(request)
        .then((response) => {
          // Clone immediately before any other operations
          if (response.ok) {
            const responseToCache = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Return nothing or placeholder if needed
        });
    })
  );
});

// Handle Push Notifications
self.addEventListener('push', function (event) {
  if (event.data) {
    const data = event.data.json();

    // Use absolute URLs for icons
    const baseUrl = self.location.origin;
    const iconUrl = `${baseUrl}/logo.png`;
    const badgeUrl = `${baseUrl}/logo.png`;

    // Determine if this is an important notification (stock alert, order update)
    const isImportant = data.type === 'stock_alert' || data.type === 'order_update';

    const options = {
      body: data.body || 'New update from your store!',
      icon: data.icon || iconUrl,
      badge: data.badge || badgeUrl,
      image: data.image || null, // Rich notification image (Android)
      vibrate: [100, 50, 100, 50, 100],
      timestamp: Date.now(),
      tag: data.tag || 'general-notification', // Group similar notifications
      renotify: data.renotify !== false, // Vibrate again for same tag updates
      requireInteraction: isImportant, // Keep important notifications visible
      silent: data.silent || false,
      data: {
        dateOfArrival: Date.now(),
        url: data.link || '/',
        type: data.type || 'general',
        productId: data.productId || null,
      },
      actions: data.actions || [
        { action: 'open', title: data.language === 'ar' ? 'عرض التفاصيل' : 'View Details' },
        { action: 'close', title: data.language === 'ar' ? 'إغلاق' : 'Close' },
      ]
    };

    // Remove null values to prevent errors
    if (!options.image) delete options.image;

    const title = data.title || 'Store Notification';

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  }
});

// Handle Notification Click
self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      // Ensure URL is absolute/full
      let urlToOpen = event.notification.data.url || '/';
      if (!urlToOpen.startsWith('http')) {
        urlToOpen = new URL(urlToOpen, self.location.origin).href;
      }

      // Check if there's already a tab open
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        // Match origin to ensure we are controlling our own app
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          return client.focus().then(focusedClient => {
            return focusedClient.navigate(urlToOpen);
          });
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
