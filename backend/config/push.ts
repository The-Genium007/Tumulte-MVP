import webPush from 'web-push'
import env from '#start/env'

/**
 * Configuration des notifications push avec VAPID
 *
 * Les clés VAPID doivent être définies dans les variables d'environnement.
 * Générer avec: npx web-push generate-vapid-keys
 *
 * Note: Cette configuration ne cache PAS les échecs d'initialisation.
 * Cela permet de gérer les cas où les variables d'environnement ne sont
 * pas immédiatement disponibles au démarrage (ex: Dokploy, containers).
 */

interface PushConfig {
  vapidPublicKey: string
  vapidPrivateKey: string
  vapidSubject: string
  isConfigured: boolean
}

// Cache uniquement les configs réussies
let successfulConfig: PushConfig | null = null

/**
 * Initialise la configuration push de manière lazy
 * Ne cache que les configurations réussies pour permettre une réinitialisation
 * si les variables d'environnement deviennent disponibles plus tard
 */
function initPushConfig(): PushConfig {
  // Retourner le cache seulement si l'initialisation a réussi
  if (successfulConfig) {
    return successfulConfig
  }

  // Use AdonisJS env helper instead of process.env for proper loading
  const vapidPublicKey = env.get('VAPID_PUBLIC_KEY')
  const vapidPrivateKey = env.get('VAPID_PRIVATE_KEY')

  if (!vapidPublicKey || !vapidPrivateKey) {
    // Log seulement une fois par requête, pas à chaque accès
    // Ne pas cacher l'échec - les variables peuvent devenir disponibles
    return {
      vapidPublicKey: '',
      vapidPrivateKey: '',
      vapidSubject: '',
      isConfigured: false,
    }
  }

  // VAPID subject doit être une URL https: ou mailto:
  let vapidSubject = env.get('VAPID_SUBJECT')

  if (!vapidSubject) {
    const frontendUrl = env.get('FRONTEND_URL')
    if (frontendUrl && frontendUrl.startsWith('https://')) {
      vapidSubject = frontendUrl
    } else {
      // Fallback vers mailto: pour le développement local
      vapidSubject = 'mailto:contact@tumulte.app'
    }
  }

  // Configurer web-push avec les clés VAPID
  webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

  // Cacher uniquement les configurations réussies
  successfulConfig = {
    vapidPublicKey,
    vapidPrivateKey,
    vapidSubject,
    isConfigured: true,
  }

  return successfulConfig
}

// Export un objet avec un getter pour l'initialisation lazy
const pushConfig = {
  get vapidPublicKey(): string {
    return initPushConfig().vapidPublicKey
  },
  get vapidPrivateKey(): string {
    return initPushConfig().vapidPrivateKey
  },
  get vapidSubject(): string {
    return initPushConfig().vapidSubject
  },
  get isConfigured(): boolean {
    return initPushConfig().isConfigured
  },
}

export default pushConfig
