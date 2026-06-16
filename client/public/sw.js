/* Group Bank — Service Worker (web push) */

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = {
      title: "Group Bank",
      body: event.data ? event.data.text() : "",
      data: {},
    };
  }

  const title = payload.title || "Group Bank";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/icon-192.png",
    badge: payload.badge || "/badge-72.png",
    data: payload.data || {},
    vibrate: [80, 40, 80],
    tag: (payload.data && payload.data.tag) || undefined,
    renotify: false,
  };

  event.waitUntil(
    (async () => {
      // If the app is already open & focused/visible, let the in-app toast
      // handle it and skip the system notification (avoids duplicates).
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const appIsOpen = clients.some(
        (c) => c.focused || c.visibilityState === "visible"
      );
      if (appIsOpen) return;
      await self.registration.showNotification(title, options);
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const targetUrl = data.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          // Focus an existing tab if one is already open.
          if ("focus" in client) {
            client.focus();
            if ("navigate" in client && targetUrl) {
              try {
                client.navigate(targetUrl);
              } catch (e) {
                /* ignore navigation errors */
              }
            }
            return;
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
