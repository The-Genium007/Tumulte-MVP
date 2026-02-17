import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'
import GamificationInstance, { type TriggerData } from '#models/gamification_instance'
import GamificationEvent from '#models/gamification_event'
import GamificationContribution from '#models/gamification_contribution'
import CampaignGamificationConfig from '#models/campaign_gamification_config'
import { campaign as Campaign } from '#models/campaign'
import { ObjectiveCalculator, type StreamerData } from './objective_calculator.js'
import { ActionExecutor, type FoundryCommandService } from './action_executor.js'
import { ExecutionTracker } from './execution_tracker.js'

/**
 * Données pour créer une instance individuelle
 */
export interface CreateIndividualInstanceData {
  campaign: Campaign
  event: GamificationEvent
  config: CampaignGamificationConfig
  streamerId: string
  streamerName: string
  viewerCount: number
  triggerData: TriggerData
}

/**
 * Données pour créer une instance groupée
 */
export interface CreateGroupInstanceData {
  campaign: Campaign
  event: GamificationEvent
  config: CampaignGamificationConfig
  streamersData: StreamerData[]
  triggerData: TriggerData
}

/**
 * Données d'une contribution
 */
export interface ContributionData {
  streamerId: string
  twitchUserId: string
  twitchUsername: string
  amount: number
  twitchRedemptionId: string
}

/**
 * InstanceManager - Gestion du cycle de vie des instances de gamification
 *
 * Gère la création, progression, complétion et expiration des instances.
 */
@inject()
export class InstanceManager {
  constructor(
    private objectiveCalculator: ObjectiveCalculator,
    private actionExecutor: ActionExecutor,
    private executionTracker: ExecutionTracker
  ) {}

  /**
   * Injecte le service Foundry pour l'exécution des actions
   */
  setFoundryCommandService(service: FoundryCommandService): void {
    this.actionExecutor.setFoundryCommandService(service)
  }

  /**
   * Crée une instance individuelle (pour un seul streamer)
   */
  async createIndividual(data: CreateIndividualInstanceData): Promise<GamificationInstance> {
    const { campaign, event, config, streamerId, streamerName, viewerCount, triggerData } = data

    // Calcul de l'objectif
    const objectiveTarget = this.objectiveCalculator.calculateIndividual(viewerCount, config, event)

    // Calcul des timestamps
    const duration = config.getEffectiveDuration(event)
    const now = DateTime.now()
    const expiresAt = now.plus({ seconds: duration })

    // Création de l'instance
    const instance = await GamificationInstance.create({
      campaignId: campaign.id,
      eventId: event.id,
      type: 'individual',
      status: 'active',
      triggerData,
      objectiveTarget,
      currentProgress: 0,
      duration,
      startsAt: now,
      expiresAt,
      streamerId,
      viewerCountAtStart: viewerCount,
    })

    logger.info(
      {
        event: 'gamification_instance_created',
        instanceId: instance.id,
        type: 'individual',
        campaignId: campaign.id,
        eventSlug: event.slug,
        streamerId,
        streamerName,
        viewerCount,
        objectiveTarget,
        duration,
      },
      'Instance de gamification individuelle créée'
    )

    return instance
  }

  /**
   * Crée une instance groupée (pour tous les streamers)
   */
  async createGroup(data: CreateGroupInstanceData): Promise<GamificationInstance> {
    const { campaign, event, config, streamersData, triggerData } = data

    // Calcul de l'objectif groupé
    const { totalObjective, streamerSnapshots } = this.objectiveCalculator.calculateGroup(
      streamersData,
      config,
      event
    )

    // Calcul des timestamps
    const duration = config.getEffectiveDuration(event)
    const now = DateTime.now()
    const expiresAt = now.plus({ seconds: duration })

    // Création de l'instance
    const instance = await GamificationInstance.create({
      campaignId: campaign.id,
      eventId: event.id,
      type: 'group',
      status: 'active',
      triggerData,
      objectiveTarget: totalObjective,
      currentProgress: 0,
      duration,
      startsAt: now,
      expiresAt,
      streamerSnapshots,
    })

    logger.info(
      {
        event: 'gamification_instance_created',
        instanceId: instance.id,
        type: 'group',
        campaignId: campaign.id,
        eventSlug: event.slug,
        streamersCount: streamersData.length,
        totalObjective,
        duration,
      },
      'Instance de gamification groupée créée'
    )

    return instance
  }

  /**
   * Ajoute une contribution à une instance
   *
   * @returns L'instance mise à jour et un booléen indiquant si l'objectif est atteint
   */
  async addContribution(
    instanceId: string,
    contribution: ContributionData
  ): Promise<{ instance: GamificationInstance; objectiveReached: boolean }> {
    // Vérifier que la redemption n'a pas déjà été traitée
    const existingContribution = await GamificationContribution.query()
      .where('twitchRedemptionId', contribution.twitchRedemptionId)
      .first()

    if (existingContribution) {
      logger.warn(
        {
          event: 'duplicate_contribution',
          instanceId,
          twitchRedemptionId: contribution.twitchRedemptionId,
        },
        'Contribution dupliquée ignorée'
      )

      const instance = await GamificationInstance.findOrFail(instanceId)
      return { instance, objectiveReached: instance.isObjectiveReached }
    }

    // Récupérer l'instance
    const instance = await GamificationInstance.findOrFail(instanceId)

    // Vérifier que l'instance est active
    if (!instance.isActive) {
      logger.warn(
        {
          event: 'contribution_to_inactive_instance',
          instanceId,
          status: instance.status,
        },
        'Tentative de contribution sur une instance inactive'
      )
      return { instance, objectiveReached: false }
    }

    // Créer la contribution
    await GamificationContribution.create({
      instanceId,
      streamerId: contribution.streamerId,
      twitchUserId: contribution.twitchUserId,
      twitchUsername: contribution.twitchUsername,
      amount: contribution.amount,
      twitchRedemptionId: contribution.twitchRedemptionId,
    })

    // Mettre à jour la progression
    // On compte les contributions, pas les points (1 clic = 1 progression)
    instance.currentProgress += 1
    await instance.save()

    // Mettre à jour les snapshots si instance groupée
    if (instance.type === 'group' && instance.streamerSnapshots) {
      await this.updateStreamerSnapshot(instance, contribution.streamerId)
    }

    logger.info(
      {
        event: 'contribution_added',
        instanceId,
        streamerId: contribution.streamerId,
        twitchUserId: contribution.twitchUserId,
        progress: instance.currentProgress,
        target: instance.objectiveTarget,
        percentage: instance.progressPercentage,
      },
      'Contribution ajoutée'
    )

    return {
      instance,
      objectiveReached: instance.isObjectiveReached,
    }
  }

  /**
   * Met à jour le snapshot d'un streamer dans une instance groupée
   */
  private async updateStreamerSnapshot(
    instance: GamificationInstance,
    streamerId: string
  ): Promise<void> {
    if (!instance.streamerSnapshots) return

    const snapshots = [...instance.streamerSnapshots]
    const snapshotIndex = snapshots.findIndex((s) => s.streamerId === streamerId)

    if (snapshotIndex !== -1) {
      snapshots[snapshotIndex].contributions += 1
      instance.streamerSnapshots = snapshots
      await instance.save()
    }
  }

  /**
   * Complète une instance (objectif atteint)
   *
   * Marque l'instance comme complétée avec execution_status='pending'.
   * L'action sera exécutée par Foundry VTT qui appellera le callback.
   *
   * @param executeImmediately - Si true, exécute l'action immédiatement (ancien comportement)
   */
  async complete(
    instance: GamificationInstance,
    event: GamificationEvent,
    config: CampaignGamificationConfig,
    connectionId: string,
    executeImmediately: boolean = false
  ): Promise<GamificationInstance> {
    // Calculer la fin du cooldown
    const cooldownSeconds = config.cooldown ?? this.getDefaultCooldown(event)
    const cooldownEndsAt =
      cooldownSeconds > 0 ? DateTime.now().plus({ seconds: cooldownSeconds }) : null

    // Mettre à jour l'instance - status completed mais execution pending
    instance.status = 'completed'
    instance.completedAt = DateTime.now()
    instance.cooldownEndsAt = cooldownEndsAt

    if (executeImmediately) {
      // Ancien comportement: exécuter immédiatement
      const resultData = await this.actionExecutor.execute(event, instance, connectionId)
      instance.resultData = resultData
      instance.executionStatus = resultData.success ? 'executed' : 'failed'
      instance.executedAt = DateTime.now()

      if (!resultData.success) {
        logger.error(
          {
            event: 'action_execution_failed',
            instanceId: instance.id,
            error: resultData.error,
            actionResult: resultData.actionResult,
          },
          "Échec de l'exécution de l'action"
        )
      }
    } else {
      // Nouveau comportement: marquer comme pending, Foundry exécutera plus tard
      instance.executionStatus = 'pending'
      instance.resultData = {
        success: false, // Sera mis à jour quand Foundry confirme
        message: "En attente d'exécution par le VTT",
      }

      // Tracker dans Redis pour accès rapide
      await this.executionTracker.markPendingExecution(instance, event.name, event.actionType)
    }

    await instance.save()

    logger.info(
      {
        event: 'gamification_instance_completed',
        instanceId: instance.id,
        executionStatus: instance.executionStatus,
        executeImmediately,
        cooldownEndsAt: cooldownEndsAt?.toISO(),
      },
      'Instance de gamification complétée'
    )

    return instance
  }

  /**
   * Marque une instance comme exécutée (callback de Foundry VTT)
   */
  async markExecuted(
    instanceId: string,
    success: boolean,
    message?: string
  ): Promise<GamificationInstance | null> {
    const result = await this.executionTracker.markExecuted(instanceId, success, message)
    return result?.instance ?? null
  }

  /**
   * Retourne le cooldown par défaut d'un événement
   */
  private getDefaultCooldown(event: GamificationEvent): number {
    if (event.cooldownType === 'time' && event.cooldownConfig?.durationSeconds) {
      return event.cooldownConfig.durationSeconds
    }
    // Cooldown par défaut: 5 minutes
    return 300
  }

  /**
   * Expire une instance (temps écoulé sans atteindre l'objectif)
   */
  async expire(instance: GamificationInstance): Promise<GamificationInstance> {
    instance.status = 'expired'
    await instance.save()

    logger.info(
      {
        event: 'gamification_instance_expired',
        instanceId: instance.id,
        progress: instance.currentProgress,
        target: instance.objectiveTarget,
      },
      'Instance de gamification expirée'
    )

    return instance
  }

  /**
   * Annule une instance (annulation manuelle par le MJ)
   */
  async cancel(instance: GamificationInstance): Promise<GamificationInstance> {
    instance.status = 'cancelled'
    await instance.save()

    logger.info(
      {
        event: 'gamification_instance_cancelled',
        instanceId: instance.id,
      },
      'Instance de gamification annulée'
    )

    return instance
  }

  /**
   * Vérifie si un événement est en cooldown pour une campagne/streamer
   */
  async isOnCooldown(
    campaignId: string,
    eventId: string,
    streamerId?: string
  ): Promise<{ onCooldown: boolean; endsAt: DateTime | null }> {
    const query = GamificationInstance.query()
      .where('campaignId', campaignId)
      .where('eventId', eventId)
      .where('status', 'completed')
      .whereNotNull('cooldownEndsAt')
      .where('cooldownEndsAt', '>', DateTime.now().toSQL()!)
      .orderBy('cooldownEndsAt', 'desc')

    if (streamerId) {
      query.where('streamerId', streamerId)
    }

    const instance = await query.first()

    if (instance?.cooldownEndsAt) {
      return {
        onCooldown: true,
        endsAt: instance.cooldownEndsAt,
      }
    }

    return {
      onCooldown: false,
      endsAt: null,
    }
  }

  /**
   * Récupère les instances actives d'une campagne
   */
  async getActiveInstances(campaignId: string): Promise<GamificationInstance[]> {
    return GamificationInstance.query()
      .where('campaignId', campaignId)
      .where('status', 'active')
      .where('expiresAt', '>', DateTime.now().toSQL()!)
      .preload('event')
      .orderBy('startsAt', 'desc')
  }

  /**
   * Récupère l'instance active pour un streamer
   */
  async getActiveInstanceForStreamer(
    campaignId: string,
    streamerId: string
  ): Promise<GamificationInstance | null> {
    return GamificationInstance.query()
      .where('campaignId', campaignId)
      .where('status', 'active')
      .where('expiresAt', '>', DateTime.now().toSQL()!)
      .where((query) => {
        // Instance individuelle pour ce streamer
        query.where('streamerId', streamerId)
        // Ou instance groupée
        query.orWhereNull('streamerId')
      })
      .preload('event')
      .orderBy('startsAt', 'desc')
      .first()
  }

  /**
   * Récupère l'instance active OU armed pour un streamer et un événement spécifique
   *
   * Utilisé pour le nouveau flux où:
   * - active: jauge en cours de remplissage
   * - armed: jauge remplie, en attente d'un critique
   */
  async getActiveOrArmedInstanceForStreamer(
    campaignId: string,
    streamerId: string,
    eventId: string
  ): Promise<GamificationInstance | null> {
    return GamificationInstance.query()
      .where('campaignId', campaignId)
      .where('eventId', eventId)
      .whereIn('status', ['active', 'armed'])
      .where((query) => {
        // Instance individuelle pour ce streamer
        query.where('streamerId', streamerId)
        // Ou instance groupée
        query.orWhereNull('streamerId')
      })
      .preload('event')
      .orderBy('startsAt', 'desc')
      .first()
  }

  /**
   * Passe une instance en état "armed" (jauge remplie, en attente d'un critique)
   *
   * Cet état est spécifique au nouveau flux où l'action n'est pas exécutée
   * immédiatement mais attend un jet critique du joueur.
   */
  async armInstance(instance: GamificationInstance): Promise<GamificationInstance> {
    instance.status = 'armed'
    instance.armedAt = DateTime.now()
    await instance.save()

    logger.info(
      {
        event: 'gamification_instance_armed',
        instanceId: instance.id,
        campaignId: instance.campaignId,
        eventId: instance.eventId,
        streamerId: instance.streamerId,
      },
      'Instance de gamification armée - en attente de critique'
    )

    return instance
  }

  /**
   * Récupère l'instance armed pour un streamer et un événement
   *
   * Utilisé pour vérifier si un jet critique peut être consommé
   */
  async getArmedInstanceForStreamer(
    campaignId: string,
    streamerId: string,
    eventId: string
  ): Promise<GamificationInstance | null> {
    return GamificationInstance.query()
      .where('campaignId', campaignId)
      .where('eventId', eventId)
      .where('status', 'armed')
      .where((query) => {
        query.where('streamerId', streamerId)
        query.orWhereNull('streamerId')
      })
      .preload('event')
      .first()
  }

  /**
   * Consomme une instance armed lors d'un jet critique
   *
   * Passe l'instance de 'armed' à 'completed' et exécute l'action
   */
  async consumeArmedInstance(
    instance: GamificationInstance,
    event: GamificationEvent,
    config: CampaignGamificationConfig,
    connectionId: string,
    diceRollData?: {
      rollId: string
      characterId: string | null
      vttCharacterId?: string | null
      characterName: string | null
      formula: string
      result: number
      diceResults: number[]
      criticalType: 'success' | 'failure'
      messageId?: string
    }
  ): Promise<GamificationInstance> {
    // Mettre à jour les triggerData avec les infos du dé qui a consommé
    if (diceRollData) {
      instance.triggerData = {
        ...instance.triggerData,
        diceRoll: diceRollData,
      }
    }

    // Compléter l'instance (exécution immédiate car c'est le moment du critique)
    return this.complete(instance, event, config, connectionId, true)
  }

  /**
   * Reset les cooldowns d'une campagne (appelé au lancement de session)
   */
  async resetCooldowns(campaignId: string): Promise<number> {
    const result = await GamificationInstance.query()
      .where('campaignId', campaignId)
      .where('status', 'completed')
      .whereNotNull('cooldownEndsAt')
      .update({ cooldownEndsAt: null })

    logger.info(
      {
        event: 'cooldowns_reset',
        campaignId,
        count: result[0],
      },
      'Cooldowns de gamification réinitialisés'
    )

    return result[0] as number
  }

  /**
   * Reset les cooldowns encore actifs, avec filtre optionnel par streamer
   * Utilisé par les outils de maintenance MJ (production-safe)
   */
  async resetCooldownsFiltered(campaignId: string, streamerId?: string): Promise<number> {
    const query = GamificationInstance.query()
      .where('campaignId', campaignId)
      .where('status', 'completed')
      .whereNotNull('cooldownEndsAt')
      .where('cooldownEndsAt', '>', DateTime.now().toSQL()!)

    if (streamerId) {
      query.where('streamerId', streamerId)
    }

    const result = await query.update({ cooldownEndsAt: null })

    logger.info(
      {
        event: 'cooldowns_reset_filtered',
        campaignId,
        streamerId: streamerId || 'all',
        count: result[0],
      },
      'Cooldowns réinitialisés (filtrés)'
    )

    return result[0] as number
  }

  /**
   * Vérifie et expire les instances dont le temps est écoulé
   * Appelé périodiquement par un job
   */
  async checkAndExpireInstances(): Promise<number> {
    const expiredInstances = await GamificationInstance.query()
      .where('status', 'active')
      .where('expiresAt', '<=', DateTime.now().toSQL()!)

    let count = 0
    for (const instance of expiredInstances) {
      await this.expire(instance)
      count++
    }

    if (count > 0) {
      logger.info(
        {
          event: 'instances_expired_by_job',
          count,
        },
        'Instances expirées par le job'
      )
    }

    return count
  }
}

export default InstanceManager
