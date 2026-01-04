import webPush from 'web-push'

/**
 * Configuration des notifications push avec VAPID
 *
 * Les clés VAPID doivent être définies dans les variables d'environnement.
 * Générer avec: npx web-push generate-vapid-keys
 */

interface PushConfig {
  vapidPublicKey: string
  vapidPrivateKey: string
  vapidSubject: string
  isConfigured: boolean
}

let cachedConfig: PushConfig | null = null

/**
 * Initialise la configuration push de manière lazy
 * Appelé uniquement quand la config est effectivement utilisée
 */
function initPushConfig(): PushConfig {
  if (cachedConfig) {
    return cachedConfig
  }

  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY

  if (!vapidPublicKey || !vapidPrivateKey) {
    process.stderr.write(
      '[Push Config] ERROR: VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be defined in .env\n'
    )
    process.stderr.write('[Push Config] Generate keys with: npx web-push generate-vapid-keys\n')

    cachedConfig = {
      vapidPublicKey: '',
      vapidPrivateKey: '',
      vapidSubject: '',
      isConfigured: false,
    }
    return cachedConfig
  }

  // VAPID subject doit être une URL https: ou mailto:
  let vapidSubject = process.env.VAPID_SUBJECT

  if (!vapidSubject) {
    const frontendUrl = process.env.FRONTEND_URL
    if (frontendUrl && frontendUrl.startsWith('https://')) {
      vapidSubject = frontendUrl
    } else {
      // Fallback vers mailto: pour le développement local
      vapidSubject = 'mailto:contact@tumulte.app'
    }
  }

  // Configurer web-push avec les clés VAPID
  webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

  cachedConfig = {
    vapidPublicKey,
    vapidPrivateKey,
    vapidSubject,
    isConfigured: true,
  }

  return cachedConfig
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
