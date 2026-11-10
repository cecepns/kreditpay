import { clientsClaim } from "workbox-core";
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.skipWaiting();
clientsClaim();

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST || []);

registerRoute(
  new NavigationRoute(createHandlerBoundToURL("/index.html"), {
    denylist: [/^\/api/, /^\/uploads/],
  })
);

self.addEventListener("push", (event) => {
  let payload = {
    title: "Fastkredit",
    body: "Anda memiliki pemberitahuan baru.",
    url: "/app/notifikasi",
    notificationId: null,
    tag: `fk-push-${Date.now()}`,
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      if (parsed && typeof parsed === "object") {
        payload = { ...payload, ...parsed };
      }
    } catch {
      try {
        const text = event.data.text();
        if (text) payload.body = text;
      } catch {
        // ignore parse error
      }
    }
  }

  const title = payload.title || "Fastkredit";
  const options = {
    body: payload.body || "",
    icon: "/pwa-192.png",
    badge: "/pwa-192.png",
    tag: payload.tag || (payload.notificationId ? `fk-notif-${payload.notificationId}` : `fk-push-${Date.now()}`),
    renotify: true,
    vibrate: [120, 60, 120],
    data: {
      url: payload.url || "/app/notifikasi",
      notificationId: payload.notificationId || null,
      title,
      body: payload.body || "",
    },
  };

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, options);
      const windowClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of windowClients) {
        client.postMessage({
          type: "PUSH_RECEIVED",
          notification: {
            id: payload.notificationId || null,
            title,
            body: payload.body || "",
            url: payload.url || "/app/notifikasi",
            timestamp: payload.timestamp || Date.now(),
          },
        });
      }
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const rawUrl = event.notification?.data?.url || "/app/notifikasi";
  const targetUrlObj = new URL(rawUrl, self.location.origin);
  const targetUrl = targetUrlObj.href;

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      const matchingClient = windowClients.find((client) => {
        try {
          return new URL(client.url).origin === self.location.origin;
        } catch {
          return false;
        }
      });

      if (matchingClient) {
        const focused = await matchingClient.focus().catch(() => matchingClient);
        try {
          const current = new URL(matchingClient.url);
          if (current.pathname + current.search !== targetUrlObj.pathname + targetUrlObj.search) {
            if (focused && typeof focused.navigate === "function") {
              await focused.navigate(targetUrl).catch(() => {});
            }
          }
        } catch {
          // ignore
        }
        return focused;
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })()
  );
});

