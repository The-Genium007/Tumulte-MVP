import { inject } from '@adonisjs/core'
import redis from '@adonisjs/redis/services/main'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'
import GamificationInstance from '#models/gamification_instance'
import transmit from '@adonisjs/transmit/services/main'

/**
 * Données stockées dans Redis pour une instance en attente d'exécution
 */
export interface PendingExecutionData {
  instanceId: string
  campaignId: string
  eventId: string
  streamerId: string | null
  actionType: string
  eventName: string
  triggerData: {
    diceRoll?: {
      originalValue: number
      invertedValue: number
      characterName: string
    }
  } | null
  completedAt: string
}

/**
 * Payload envoyé via WebSocket quand une action est exécutée
 */
export interface ActionExecutedPayload {
  instanceId: string
  eventName: string
  actionType: 'dice_invert' | 'chat_message' | 'stat_modify'
  success: boolean
  message?: string
  originalValue?: number
  invertedValue?: number
  [key: string]: string | number | boolean | undefined
}

const REDIS_PREFIX = 'gamification:pending:'
const REDIS_TTL = 86400 // 24 heures (l'action peut être exécutée longtemps après)

/**
 * ExecutionTracker - Service de suivi de l'exécution des actions gamification
 *
 * Gère le suivi des instances en attente d'exécution via Redis (cache rapide)
 * avec PostgreSQL comme source de vérité.
 *
 * Flow:
 * 1. Instance complète la jauge → status='completed', execution_status='pending'
 * 2. Données mises en cache Redis pour accès rapide
 * 3. Foundry exécute l'action (peut être 20+ minutes plus tard)
 * 4. Foundry appelle le callback → execution_status='executed', WebSocket envoyé
 */
@inject()
export class ExecutionTracker {
  /**
   * Marque une instance comme en attente d'exécution
   * Appelé quand la jauge est complétée
   */
  async markPendingExecution(
    instance: GamificationInstance,
    eventName: string,
    actionType: string
  ): Promise<void> {
    // Préparer les données pour Redis
    const pendingData: PendingExecutionData = {
      instanceId: instance.id,
      campaignId: instance.campaignId,
      eventId: instance.eventId,
      streamerId: instance.streamerId,
      actionType,
      eventName,
      triggerData: instance.triggerData
        ? {
            diceRoll: instance.triggerData.diceRoll
              ? {
                  originalValue: instance.triggerData.diceRoll.result,
                  invertedValue: this.calculateInvertedValue(instance.triggerData.diceRoll.result),
                  characterName: instance.triggerData.diceRoll.characterName || 'Personnage',
                }
              : undefined,
          }
        : null,
      completedAt: DateTime.now().toISO()!,
    }

    // Mettre à jour PostgreSQL
    instance.executionStatus = 'pending'
    await instance.save()

    // Mettre en cache Redis
    const redisKey = `${REDIS_PREFIX}${instance.id}`
    await redis.set(redisKey, JSON.stringify(pendingData), 'EX', REDIS_TTL)

    logger.info(
      {
        event: 'execution_pending',
        instanceId: instance.id,
        eventName,
        actionType,
      },
      "Instance marquée en attente d'exécution"
    )
  }

  /**
   * Marque une instance comme exécutée avec succès
   * Appelé par le callback Foundry
   */
  async markExecuted(
    instanceId: string,
    success: boolean,
    message?: string
  ): Promise<{ instance: GamificationInstance; payload: ActionExecutedPayload } | null> {
    // Essayer Redis d'abord (plus rapide)
    const redisKey = `${REDIS_PREFIX}${instanceId}`
    let pendingData: PendingExecutionData | null = null

    try {
      const cached = await redis.get(redisKey)
      if (cached) {
        pendingData = JSON.parse(cached) as PendingExecutionData
      }
    } catch (error) {
      logger.warn({ error }, 'Erreur lecture Redis, fallback PostgreSQL')
    }

    // Récupérer l'instance depuis PostgreSQL (source de vérité)
    const instance = await GamificationInstance.query()
      .where('id', instanceId)
      .preload('event')
      .first()

    if (!instance) {
      logger.error({ instanceId }, 'Instance non trouvée pour marquer comme exécutée')
      return null
    }

    // Vérifier que l'instance est bien en attente
    if (instance.executionStatus !== 'pending') {
      logger.warn(
        {
          instanceId,
          currentStatus: instance.executionStatus,
        },
        "Instance n'est pas en attente d'exécution"
      )
      return null
    }

    // Mettre à jour PostgreSQL
    instance.executionStatus = success ? 'executed' : 'failed'
    instance.executedAt = DateTime.now()
    if (instance.resultData) {
      instance.resultData = {
        ...instance.resultData,
        executed: true,
        executedAt: DateTime.now().toISO(),
        executionSuccess: success,
        executionMessage: message,
      }
    } else {
      instance.resultData = {
        success,
        executed: true,
        executedAt: DateTime.now().toISO(),
        executionSuccess: success,
        executionMessage: message,
      }
    }
    await instance.save()

    // Supprimer du cache Redis
    try {
      await redis.del(redisKey)
    } catch (error) {
      logger.warn({ error }, 'Erreur suppression Redis')
    }

    // Préparer le payload WebSocket
    const payload: ActionExecutedPayload = {
      instanceId: instance.id,
      eventName: pendingData?.eventName || instance.event?.name || 'Action',
      actionType: (pendingData?.actionType ||
        instance.event?.actionType ||
        'custom') as ActionExecutedPayload['actionType'],
      success,
      message,
    }

    // Ajouter les données spécifiques pour dice_invert
    if (pendingData?.triggerData?.diceRoll) {
      payload.originalValue = pendingData.triggerData.diceRoll.originalValue
      payload.invertedValue = pendingData.triggerData.diceRoll.invertedValue
    } else if (instance.triggerData?.diceRoll) {
      payload.originalValue = instance.triggerData.diceRoll.result
      payload.invertedValue = this.calculateInvertedValue(instance.triggerData.diceRoll.result)
    }

    // Envoyer WebSocket à tous les streamers concernés
    await this.broadcastActionExecuted(instance, payload)

    logger.info(
      {
        event: 'execution_completed',
        instanceId,
        success,
        message,
      },
      'Instance marquée comme exécutée'
    )

    return { instance, payload }
  }

  /**
   * Récupère les instances en attente d'exécution pour une campagne
   */
  async getPendingInstances(campaignId: string): Promise<GamificationInstance[]> {
    return GamificationInstance.query()
      .where('campaignId', campaignId)
      .where('status', 'completed')
      .where('executionStatus', 'pending')
      .preload('event')
      .orderBy('completedAt', 'asc')
  }

  /**
   * Récupère les instances en attente pour un streamer spécifique
   */
  async getPendingInstancesForStreamer(streamerId: string): Promise<GamificationInstance[]> {
    return GamificationInstance.query()
      .where('streamerId', streamerId)
      .where('status', 'completed')
      .where('executionStatus', 'pending')
      .preload('event')
      .orderBy('completedAt', 'asc')
  }

  /**
   * Vérifie si une instance est en attente (via Redis puis PostgreSQL)
   */
  async isPending(instanceId: string): Promise<boolean> {
    // Essayer Redis d'abord
    const redisKey = `${REDIS_PREFIX}${instanceId}`
    try {
      const exists = await redis.exists(redisKey)
      if (exists) return true
    } catch {
      // Fallback PostgreSQL
    }

    // Vérifier PostgreSQL
    const instance = await GamificationInstance.query()
      .where('id', instanceId)
      .where('executionStatus', 'pending')
      .first()

    return !!instance
  }

  /**
   * Broadcast l'événement action_executed via WebSocket
   */
  private async broadcastActionExecuted(
    instance: GamificationInstance,
    payload: ActionExecutedPayload
  ): Promise<void> {
    // Message WebSocket à broadcaster
    const message = {
      event: 'gamification:action_executed',
      data: payload,
    }

    // Pour une instance individuelle, broadcast au streamer
    if (instance.streamerId) {
      const channel = `streamer:${instance.streamerId}:polls`
      transmit.broadcast(channel, message as any)

      logger.debug(
        {
          channel,
          instanceId: instance.id,
        },
        'Action executed broadcast to streamer'
      )
    }

    // Pour une instance groupée, broadcast à tous les streamers de la campagne
    if (instance.type === 'group' && instance.streamerSnapshots) {
      for (const snapshot of instance.streamerSnapshots) {
        const channel = `streamer:${snapshot.streamerId}:polls`
        transmit.broadcast(channel, message as any)
      }

      logger.debug(
        {
          instanceId: instance.id,
          streamersCount: instance.streamerSnapshots.length,
        },
        'Action executed broadcast to all streamers in group'
      )
    }
  }

  /**
   * Calcule la valeur inversée d'un dé (pour D20)
   */
  private calculateInvertedValue(originalValue: number): number {
    // Pour un D20: 20 → 1, 1 → 20
    const diceMax = 20
    const diceMin = 1
    return originalValue === diceMax ? diceMin : diceMax
  }

  /**
   * Nettoie les entrées Redis expirées ou orphelines
   * À appeler périodiquement via un job
   */
  async cleanupOrphaned(): Promise<number> {
    let cleaned = 0

    try {
      // Scanner les clés Redis avec le prefix
      const keys = await redis.keys(`${REDIS_PREFIX}*`)

      for (const key of keys) {
        const instanceId = key.replace(REDIS_PREFIX, '')

        // Vérifier si l'instance existe et est toujours pending
        const instance = await GamificationInstance.query().where('id', instanceId).first()

        if (!instance || instance.executionStatus !== 'pending') {
          await redis.del(key)
          cleaned++
        }
      }

      if (cleaned > 0) {
        logger.info({ cleaned }, 'Entrées Redis orphelines nettoyées')
      }
    } catch (error) {
      logger.error({ error }, 'Erreur nettoyage Redis')
    }

    return cleaned
  }
}

export default ExecutionTracker
