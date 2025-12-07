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
          if (response.ok) {
            const cache = caches.open(RUNTIME_CACHE);
            cache.then((c) => c.put(request, response.clone()));
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
          if (response.ok) {
            const cache = caches.open(RUNTIME_CACHE);
            cache.then((c) => c.put(request, response.clone()));
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
    const options = {
      body: data.body || 'تحديث جديد من خضار آند فاكهة!',
      icon: '/logo.png',
      badge: '/logo.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: '2',
        url: data.link || '/'
      },
      actions: [
        { action: 'explore', title: 'عرض التفاصيل', icon: '/logo.png' },
        { action: 'close', title: 'إغلاق', icon: '/logo.png' },
      ]
    };
    event.waitUntil(
      self.registration.showNotification(data.title || 'خضار آند فاكهة', options)
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
    clients.matchAll({ type: 'window' }).then(function (clientList) {
      // Check if there's already a tab open
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url === '/' && 'focus' in client)
          return client.focus();
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url || '/');
      }
    })
  );
});
