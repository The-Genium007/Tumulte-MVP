/* global clients */
/**
 * Service Worker Push Notifications Handler
 * Ce fichier est importé par le service worker généré par Workbox
 */

// Gestionnaire d'événements push
self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    console.error('Failed to parse push notification payload')
    return
  }

  const options = {
    body: payload.body,
    icon: payload.icon || '/web-app-manifest-192x192.png',
    badge: payload.badge || '/favicon-96x96.png',
    data: payload.data || {},
    tag: payload.type, // Évite les notifications dupliquées du même type
    renotify: true,
    requireInteraction: payload.type === 'critical:alert' || payload.type === 'campaign:invitation',
    timestamp: payload.timestamp ? new Date(payload.timestamp).getTime() : Date.now(),
  }

  // Vibration patterns selon le type de notification
  switch (payload.type) {
    case 'campaign:invitation':
      // Double vibration pour attirer l'attention
      options.vibrate = [200, 100, 200]
      break
    case 'poll:started':
      // Vibration courte
      options.vibrate = [150]
      break
    case 'critical:alert':
      // Vibration longue et insistante
      options.vibrate = [300, 100, 300, 100, 300]
      break
    default:
      options.vibrate = [100]
  }

  // Actions par défaut selon le type
  if (payload.actions && payload.actions.length > 0) {
    options.actions = payload.actions
  } else {
    switch (payload.type) {
      case 'campaign:invitation':
        options.actions = [
          { action: 'accept', title: 'Accepter' },
          { action: 'view', title: 'Voir' },
        ]
        // Deep link vers les invitations
        if (!options.data.url) {
          options.data.url = '/dashboard/invitations'
        }
        break
      case 'poll:started':
        options.actions = [{ action: 'view', title: 'Voir le sondage' }]
        break
      case 'poll:ended':
        options.actions = [{ action: 'view', title: 'Voir les résultats' }]
        break
      case 'critical:alert':
        options.actions = [{ action: 'view', title: 'Résoudre' }]
        break
      default:
        options.actions = [{ action: 'view', title: 'Voir' }]
    }
  }

  event.waitUntil(self.registration.showNotification(payload.title, options))
})

// Gestionnaire de clic sur notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const data = event.notification.data || {}
  const notificationType = event.notification.tag

  // Action "dismiss" = ne rien faire
  if (event.action === 'dismiss') {
    return
  }

  // Déterminer l'URL de destination
  let url = '/'

  // Fonction de validation d'URL (sécurité: empêcher navigation vers domaines externes)
  const validateUrl = (inputUrl) => {
    if (!inputUrl) return null
    try {
      const urlObj = new URL(inputUrl, self.location.origin)
      // Autoriser uniquement les URLs same-origin
      if (urlObj.origin === self.location.origin) {
        return urlObj.pathname + urlObj.search + urlObj.hash
      }
    } catch {
      // URL invalide
    }
    return null
  }

  // Action "accept" pour les invitations - rediriger vers les invitations
  if (event.action === 'accept' && notificationType === 'campaign:invitation') {
    url = '/dashboard/invitations'
  } else if (data.url) {
    url = validateUrl(data.url) || '/'
  } else if (data.invitationId) {
    url = '/dashboard/invitations'
  } else if (data.campaignId) {
    url = `/mj/campaigns/${data.campaignId}`
  } else if (data.pollInstanceId) {
    url = `/mj/polls/${data.pollInstanceId}`
  }

  // Ouvrir ou focus une fenêtre existante
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Chercher une fenêtre existante de l'app
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      // Sinon ouvrir une nouvelle fenêtre
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})

// Gestionnaire de fermeture de notification (optionnel, pour tracking)
self.addEventListener('notificationclose', () => {
  // On pourrait envoyer un event analytics ici si nécessaire
})
