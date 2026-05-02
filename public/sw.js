// BioPrecision Service Worker
// Handles background notification display

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

self.addEventListener("push", event => {
  if (!event.data) return;
  const { title, body, icon, tag } = event.data.json();
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: icon ?? "/icon-192.png",
      badge: "/icon-72.png",
      tag: tag ?? "bioprecision",
      renotify: true,
      data: { url: "/" },
    })
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then(clients => {
      const existing = clients.find(c => c.url.includes(self.location.origin));
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});

// Handle scheduled notifications posted via postMessage
self.addEventListener("message", event => {
  if (event.data?.type !== "SCHEDULE_NOTIFICATION") return;
  const { title, body, delayMs, tag } = event.data;
  setTimeout(() => {
    self.registration.showNotification(title, {
      body,
      icon: "/icon-192.png",
      tag: tag ?? "bioprecision",
      renotify: true,
      data: { url: "/actions" },
    });
  }, delayMs);
});
