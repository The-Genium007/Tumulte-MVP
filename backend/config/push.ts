import webPush from 'web-push'
import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Configuration des notifications push avec VAPID
 *
 * Les clés VAPID sont auto-générées en développement si non définies.
 * En production, elles doivent être définies dans les variables d'environnement.
 */

interface VapidKeys {
  publicKey: string
  privateKey: string
}

interface PushConfig {
  vapidPublicKey: string
  vapidPrivateKey: string
  vapidSubject: string
  isConfigured: boolean
}

let cachedConfig: PushConfig | null = null

function getVapidKeys(): VapidKeys | null {
  // Vérifier les variables d'environnement
  const envPublicKey = process.env.VAPID_PUBLIC_KEY
  const envPrivateKey = process.env.VAPID_PRIVATE_KEY

  if (envPublicKey && envPrivateKey) {
    return {
      publicKey: envPublicKey,
      privateKey: envPrivateKey,
    }
  }

  // En production, les clés doivent être définies
  const nodeEnv = process.env.NODE_ENV
  if (nodeEnv === 'production') {
    console.error(
      '[Push Config] VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be defined in production'
    )
    return null
  }

  // En développement/test, auto-générer les clés
  const keysFilePath = join(process.cwd(), '.vapid-keys.json')

  if (existsSync(keysFilePath)) {
    try {
      const content = readFileSync(keysFilePath, 'utf-8')
      const keys = JSON.parse(content) as VapidKeys
      console.log('[Push Config] VAPID keys loaded from .vapid-keys.json')
      return keys
    } catch {
      console.warn('[Push Config] Failed to read .vapid-keys.json, generating new keys')
    }
  }

  // Générer de nouvelles clés
  const newKeys = webPush.generateVAPIDKeys()
  const keys: VapidKeys = {
    publicKey: newKeys.publicKey,
    privateKey: newKeys.privateKey,
  }

  // Sauvegarder pour réutilisation
  try {
    writeFileSync(keysFilePath, JSON.stringify(keys, null, 2))
    console.log('[Push Config] Generated new VAPID keys and saved to .vapid-keys.json')
    console.log('[Push Config] Add these to your .env for persistence:')
    console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`)
    console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`)
  } catch {
    console.warn('[Push Config] Could not save VAPID keys to file')
  }

  return keys
}

/**
 * Initialise la configuration push de manière lazy
 * Appelé uniquement quand la config est effectivement utilisée
 */
function initPushConfig(): PushConfig {
  if (cachedConfig) {
    return cachedConfig
  }

  const vapidKeys = getVapidKeys()

  if (!vapidKeys) {
    cachedConfig = {
      vapidPublicKey: '',
      vapidPrivateKey: '',
      vapidSubject: '',
      isConfigured: false,
    }
    return cachedConfig
  }

  // VAPID subject doit être une URL https: ou mailto:
  // En développement, FRONTEND_URL est http://localhost:3000 qui n'est pas valide
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
  webPush.setVapidDetails(vapidSubject, vapidKeys.publicKey, vapidKeys.privateKey)

  cachedConfig = {
    vapidPublicKey: vapidKeys.publicKey,
    vapidPrivateKey: vapidKeys.privateKey,
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
