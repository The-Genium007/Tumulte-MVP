/* global clients */
/**
 * Service Worker Push Notifications Handler
 * Ce fichier est importé par le service worker généré par Workbox
 */

// Gestionnaire d'événements push
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    console.error("Failed to parse push notification payload");
    return;
  }

  const options = {
    body: payload.body,
    icon: payload.icon || "/pwa-192x192.png",
    badge: payload.badge || "/pwa-192x192.png",
    data: payload.data || {},
    tag: payload.type, // Évite les notifications dupliquées du même type
    renotify: true,
    requireInteraction: payload.type === "critical:alert",
    timestamp: payload.timestamp ? new Date(payload.timestamp).getTime() : Date.now(),
  };

  // Actions par défaut selon le type
  if (payload.actions && payload.actions.length > 0) {
    options.actions = payload.actions;
  } else {
    switch (payload.type) {
      case "campaign:invitation":
        options.actions = [
          { action: "view", title: "Voir" },
          { action: "dismiss", title: "Plus tard" },
        ];
        break;
      case "poll:started":
        options.actions = [{ action: "view", title: "Voir le sondage" }];
        break;
      case "poll:ended":
        options.actions = [{ action: "view", title: "Voir les résultats" }];
        break;
      case "critical:alert":
        options.actions = [{ action: "view", title: "Résoudre" }];
        break;
      default:
        options.actions = [{ action: "view", title: "Voir" }];
    }
  }

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

// Gestionnaire de clic sur notification
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};

  // Action "dismiss" = ne rien faire
  if (event.action === "dismiss") {
    return;
  }

  // Déterminer l'URL de destination
  let url = "/";

  if (data.url) {
    url = data.url;
  } else if (data.campaignId) {
    url = `/mj/campaigns/${data.campaignId}`;
  } else if (data.pollInstanceId) {
    url = `/mj/polls/${data.pollInstanceId}`;
  }

  // Ouvrir ou focus une fenêtre existante
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Chercher une fenêtre existante de l'app
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        // Sinon ouvrir une nouvelle fenêtre
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Gestionnaire de fermeture de notification (optionnel, pour tracking)
self.addEventListener("notificationclose", () => {
  // On pourrait envoyer un event analytics ici si nécessaire
});
