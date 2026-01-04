import redis from '@adonisjs/redis/services/main'
import logger from '@adonisjs/core/services/logger'

/**
 * Structure d'une entrée de log backend
 */
export interface BackendLogEntry {
  timestamp: string
  requestId: string
  method: string
  url: string
  statusCode: number
  durationMs: number
  level: 'info' | 'warn' | 'error'
  message?: string
  error?: string
}

/**
 * Service pour stocker les logs utilisateur dans Redis
 * Utilisé pour le système de support - logs récupérables via API
 */
export class BackendLogService {
  // Limite de logs par utilisateur (circular buffer)
  private readonly maxLogs = 100

  // TTL des logs en secondes (1 heure)
  private readonly ttlSeconds = 3600

  /**
   * Génère la clé Redis pour les logs d'un utilisateur
   */
  private getKey(userId: string): string {
    return `support:logs:user:${userId}`
  }

  /**
   * Ajoute un log pour un utilisateur
   * Implémente un buffer circulaire avec LPUSH + LTRIM
   */
  async pushLog(userId: string, entry: BackendLogEntry): Promise<void> {
    try {
      const key = this.getKey(userId)

      // Ajouter en tête de liste (LPUSH)
      await redis.lpush(key, JSON.stringify(entry))

      // Garder seulement les N derniers (LTRIM)
      await redis.ltrim(key, 0, this.maxLogs - 1)

      // Renouveler le TTL
      await redis.expire(key, this.ttlSeconds)

      logger.debug(
        { userId, requestId: entry.requestId, level: entry.level },
        'Pushed support log entry'
      )
    } catch (error) {
      // Log mais ne pas faire échouer la requête
      logger.error({ error, userId }, 'Failed to push support log entry')
    }
  }

  /**
   * Récupère les logs d'un utilisateur
   * @param userId ID de l'utilisateur
   * @param limit Nombre max de logs à récupérer (défaut: 50)
   * @returns Liste des logs (plus récent en premier)
   */
  async getUserLogs(userId: string, limit = 50): Promise<BackendLogEntry[]> {
    try {
      const key = this.getKey(userId)
      const entries = await redis.lrange(key, 0, limit - 1)

      return entries
        .map((entry) => {
          try {
            return JSON.parse(entry) as BackendLogEntry
          } catch {
            return null
          }
        })
        .filter((entry): entry is BackendLogEntry => entry !== null)
    } catch (error) {
      logger.error({ error, userId }, 'Failed to get user support logs')
      return []
    }
  }

  /**
   * Supprime les logs d'un utilisateur
   * Utilisé par exemple lors de la suppression de compte
   */
  async clearUserLogs(userId: string): Promise<void> {
    try {
      const key = this.getKey(userId)
      await redis.del(key)

      logger.debug({ userId }, 'Cleared user support logs')
    } catch (error) {
      logger.error({ error, userId }, 'Failed to clear user support logs')
    }
  }

  /**
   * Crée une entrée de log à partir du contexte de requête
   */
  static createLogEntry(params: {
    requestId: string
    method: string
    url: string
    statusCode: number
    durationMs: number
    error?: string
  }): BackendLogEntry {
    let level: BackendLogEntry['level'] = 'info'
    if (params.statusCode >= 500) {
      level = 'error'
    } else if (params.statusCode >= 400) {
      level = 'warn'
    }

    return {
      timestamp: new Date().toISOString(),
      requestId: params.requestId,
      method: params.method,
      url: params.url,
      statusCode: params.statusCode,
      durationMs: params.durationMs,
      level,
      error: params.error,
    }
  }
}

export const backendLogService = new BackendLogService()
