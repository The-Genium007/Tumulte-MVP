import { inject } from '@adonisjs/core'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import transmit from '@adonisjs/transmit/services/main'
import GamificationEvent from '#models/gamification_event'
import GamificationInstance from '#models/gamification_instance'
import CampaignGamificationConfig from '#models/campaign_gamification_config'
import { campaign as Campaign } from '#models/campaign'
import { TriggerEvaluator, type DiceRollData } from './trigger_evaluator.js'
import { InstanceManager, type ContributionData } from './instance_manager.js'
// ObjectiveCalculator is used by InstanceManager, not directly here
import { ActionExecutor, type FoundryCommandService } from './action_executor.js'
import type { webSocketService as WebSocketServiceClass } from '#services/websocket/websocket_service'
import type { PreFlightRunner } from '#services/preflight/preflight_runner'

/**
 * Données de redemption Twitch Channel Points (ancien système)
 */
export interface TwitchRedemptionData {
  redemptionId: string
  rewardId: string
  streamerId: string
  twitchUserId: string
  twitchUsername: string
  amount: number
}

/**
 * Données de redemption pour le nouveau système StreamerGamificationConfig
 *
 * Ce système permet aux streamers d'avoir leur propre reward Twitch
 * avec un flux en deux étapes:
 * 1. ACTIVATION: Premier clic → crée instance + contribution
 * 2. ARMED: Objectif atteint → en attente d'un jet critique
 */
export interface StreamerRedemptionData {
  redemptionId: string
  rewardId: string
  streamerId: string
  streamerConfigId: string
  campaignId: string
  eventId: string
  twitchUserId: string
  twitchUsername: string
  amount: number
}

/**
 * GamificationService - Service principal de gamification
 *
 * Orchestre les différents composants du système de gamification:
 * - TriggerEvaluator: évalue si un événement doit se déclencher
 * - InstanceManager: gère le cycle de vie des instances
 * - ObjectiveCalculator: calcule les objectifs équitables
 * - ActionExecutor: exécute les actions quand l'objectif est atteint
 */
@inject()
export class GamificationService {
  private _webSocketService: InstanceType<typeof WebSocketServiceClass> | null = null

  constructor(
    private triggerEvaluator: TriggerEvaluator,
    private instanceManager: InstanceManager,
    private actionExecutor: ActionExecutor
  ) {}

  /**
   * Résout le WebSocketService depuis le container (lazy)
   */
  private async getWebSocketService(): Promise<InstanceType<typeof WebSocketServiceClass>> {
    if (!this._webSocketService) {
      this._webSocketService = await app.container.make('webSocketService')
    }
    return this._webSocketService
  }

  /**
   * Résout le PreFlightRunner depuis le container.
   * Returns null if the container binding is not available (e.g. in unit tests).
   */
  private async getPreFlightRunner(): Promise<PreFlightRunner | null> {
    try {
      return await app.container.make('preFlightRunner')
    } catch {
      return null
    }
  }

  /**
   * Injecte le service Foundry pour l'exécution des actions
   * Propage à tous les composants qui en ont besoin
   */
  setFoundryCommandService(service: FoundryCommandService): void {
    this.actionExecutor.setFoundryCommandService(service)
    this.instanceManager.setFoundryCommandService(service)
  }

  // ========================================
  // GESTION DES ÉVÉNEMENTS
  // ========================================

  /**
   * Récupère tous les événements disponibles
   */
  async getAvailableEvents(): Promise<GamificationEvent[]> {
    return GamificationEvent.query().orderBy('name', 'asc')
  }

  /**
   * Récupère un événement par son slug
   */
  async getEventBySlug(slug: string): Promise<GamificationEvent | null> {
    return GamificationEvent.query().where('slug', slug).first()
  }

  /**
   * Récupère la configuration d'un événement pour une campagne
   */
  async getCampaignConfig(
    campaignId: string,
    eventId: string
  ): Promise<CampaignGamificationConfig | null> {
    return CampaignGamificationConfig.query()
      .where('campaignId', campaignId)
      .where('eventId', eventId)
      .preload('event')
      .first()
  }

  /**
   * Récupère toutes les configurations d'une campagne
   */
  async getCampaignConfigs(campaignId: string): Promise<CampaignGamificationConfig[]> {
    return CampaignGamificationConfig.query()
      .where('campaignId', campaignId)
      .preload('event')
      .orderBy('createdAt', 'asc')
  }

  /**
   * Active un événement pour une campagne
   */
  async enableEventForCampaign(
    campaignId: string,
    eventId: string,
    overrides?: {
      cost?: number
      objectiveCoefficient?: number
      minimumObjective?: number
      duration?: number
      cooldown?: number
      maxClicksPerUserPerSession?: number
    }
  ): Promise<CampaignGamificationConfig> {
    // Vérifier si une config existe déjà
    let config = await this.getCampaignConfig(campaignId, eventId)

    if (config) {
      // Mettre à jour la config existante
      config.isEnabled = true
      if (overrides) {
        if (overrides.cost !== undefined) config.cost = overrides.cost
        if (overrides.objectiveCoefficient !== undefined)
          config.objectiveCoefficient = overrides.objectiveCoefficient
        if (overrides.minimumObjective !== undefined)
          config.minimumObjective = overrides.minimumObjective
        if (overrides.duration !== undefined) config.duration = overrides.duration
        if (overrides.cooldown !== undefined) config.cooldown = overrides.cooldown
        if (overrides.maxClicksPerUserPerSession !== undefined)
          config.maxClicksPerUserPerSession = overrides.maxClicksPerUserPerSession
      }
      await config.save()
    } else {
      // Créer une nouvelle config
      config = await CampaignGamificationConfig.create({
        campaignId,
        eventId,
        isEnabled: true,
        cost: overrides?.cost ?? null,
        objectiveCoefficient: overrides?.objectiveCoefficient ?? null,
        minimumObjective: overrides?.minimumObjective ?? null,
        duration: overrides?.duration ?? null,
        cooldown: overrides?.cooldown ?? null,
        maxClicksPerUserPerSession: overrides?.maxClicksPerUserPerSession ?? 0,
      })
    }

    logger.info(
      {
        event: 'gamification_event_enabled',
        campaignId,
        eventId,
      },
      'Événement de gamification activé pour la campagne'
    )

    return config
  }

  /**
   * Désactive un événement pour une campagne
   */
  async disableEventForCampaign(campaignId: string, eventId: string): Promise<void> {
    const config = await this.getCampaignConfig(campaignId, eventId)
    if (config) {
      config.isEnabled = false
      await config.save()

      logger.info(
        {
          event: 'gamification_event_disabled',
          campaignId,
          eventId,
        },
        'Événement de gamification désactivé pour la campagne'
      )
    }
  }

  // ========================================
  // GESTION DES TRIGGERS
  // ========================================

  /**
   * Traite un jet de dé reçu depuis Foundry
   *
   * Deux comportements possibles:
   * 1. CONSOMMATION: Si une instance "armed" existe et c'est un critique → consommer
   * 2. CRÉATION: Sinon, évaluer si un événement dice_critical doit être déclenché
   */
  async onDiceRoll(
    campaignId: string,
    streamerId: string,
    streamerName: string,
    viewerCount: number,
    diceRollData: DiceRollData
  ): Promise<GamificationInstance | null> {
    // Pre-flight light mode (non-blocking, observability only)
    this.getPreFlightRunner()
      .then((runner) =>
        runner?.run({
          campaignId,
          eventType: 'gamification',
          mode: 'light',
          metadata: { streamerId, source: 'dice_roll' },
        })
      )
      .catch((err) => logger.debug({ err }, 'Light pre-flight skipped'))

    // === ÉTAPE 1: Vérifier s'il y a une instance armed à consommer ===
    if (diceRollData.isCritical && diceRollData.criticalType) {
      const consumedInstance = await this.tryConsumeArmedInstance(
        campaignId,
        streamerId,
        diceRollData
      )

      if (consumedInstance) {
        return consumedInstance
      }
    }

    // === ÉTAPE 2: Comportement original - créer une nouvelle instance ===
    // Récupérer les configs actives pour les événements dice_critical
    const configs = await CampaignGamificationConfig.query()
      .where('campaignId', campaignId)
      .where('isEnabled', true)
      .preload('event', (query) => {
        query.where('triggerType', 'dice_critical')
      })

    for (const config of configs) {
      if (!config.event) continue

      // Vérifier le cooldown
      const cooldownStatus = await this.instanceManager.isOnCooldown(
        campaignId,
        config.eventId,
        config.event.type === 'individual' ? streamerId : undefined
      )

      if (cooldownStatus.onCooldown) {
        logger.debug(
          {
            event: 'gamification_on_cooldown',
            campaignId,
            eventId: config.eventId,
            cooldownEndsAt: cooldownStatus.endsAt?.toISO(),
          },
          'Événement en cooldown, ignoré'
        )
        continue
      }

      // Évaluer le trigger
      const evaluation = this.triggerEvaluator.evaluate(config.event, diceRollData)

      if (evaluation.shouldTrigger && evaluation.triggerData) {
        // Créer l'instance
        const campaign = await Campaign.findOrFail(campaignId)

        if (config.event.type === 'individual') {
          const instance = await this.instanceManager.createIndividual({
            campaign,
            event: config.event,
            config,
            streamerId,
            streamerName,
            viewerCount,
            triggerData: evaluation.triggerData,
          })

          // Broadcast l'événement
          this.broadcastInstanceCreated(instance, config.event)

          return instance
        } else {
          // Pour les événements groupés, on a besoin des données de tous les streamers
          // TODO: Implémenter la récupération des viewers pour tous les streamers
          logger.warn(
            {
              event: 'group_event_not_implemented',
              campaignId,
              eventId: config.eventId,
            },
            'Les événements groupés ne sont pas encore implémentés'
          )
        }
      }
    }

    return null
  }

  /**
   * Tente de consommer une instance armed lors d'un jet critique
   *
   * Vérifie si une instance est en état "armed" pour cette campagne/streamer
   * et si le jet est un critique correspondant, la consomme et exécute l'action.
   *
   * @returns L'instance consommée ou null si aucune n'était disponible
   */
  private async tryConsumeArmedInstance(
    campaignId: string,
    streamerId: string,
    diceRollData: DiceRollData
  ): Promise<GamificationInstance | null> {
    // Récupérer les configs actives pour voir quels événements peuvent être consommés
    const configs = await CampaignGamificationConfig.query()
      .where('campaignId', campaignId)
      .where('isEnabled', true)
      .preload('event')

    for (const config of configs) {
      if (!config.event) continue

      // Chercher une instance armed pour cet événement et ce streamer
      const armedInstance = await this.instanceManager.getArmedInstanceForStreamer(
        campaignId,
        streamerId,
        config.eventId
      )

      if (!armedInstance) continue

      // Vérifier que le type de critique correspond à la config de l'événement
      const triggerConfig = config.event.triggerConfig
      if (!triggerConfig) continue

      const { criticalSuccess, criticalFailure } = triggerConfig

      // Vérifier si ce critique peut déclencher la consommation
      const shouldConsume =
        (diceRollData.criticalType === 'success' && criticalSuccess?.enabled) ||
        (diceRollData.criticalType === 'failure' && criticalFailure?.enabled)

      if (!shouldConsume) continue

      // Consommer l'instance !
      logger.info(
        {
          event: 'consuming_armed_instance',
          instanceId: armedInstance.id,
          campaignId,
          streamerId,
          criticalType: diceRollData.criticalType,
        },
        'Consommation instance armed sur jet critique'
      )

      // Récupérer le connectionId pour exécuter l'action
      const connectionId = await this.getVttConnectionId(campaignId)

      if (!connectionId) {
        logger.error(
          {
            event: 'consume_no_vtt_connection',
            instanceId: armedInstance.id,
            campaignId,
          },
          "Pas de connexion VTT pour exécuter l'action"
        )
        continue
      }

      // Consommer l'instance (passe de armed à completed et exécute l'action)
      const consumedInstance = await this.instanceManager.consumeArmedInstance(
        armedInstance,
        config.event,
        config,
        connectionId,
        {
          rollId: diceRollData.rollId,
          characterId: diceRollData.characterId,
          vttCharacterId: diceRollData.vttCharacterId ?? null,
          characterName: diceRollData.characterName,
          formula: diceRollData.formula,
          result: diceRollData.result,
          diceResults: diceRollData.diceResults,
          criticalType: diceRollData.criticalType!,
          messageId: diceRollData.messageId,
        }
      )

      // Broadcast la consommation (action exécutée) + complétion (pour que la GoalBar disparaisse)
      this.broadcastInstanceConsumed(consumedInstance, diceRollData)
      this.broadcastInstanceCompleted(consumedInstance)

      return consumedInstance
    }

    return null
  }

  /**
   * Déclenche manuellement un événement (par le MJ)
   */
  async triggerManualEvent(
    campaignId: string,
    eventId: string,
    streamerId: string,
    streamerName: string,
    viewerCount: number,
    customData?: Record<string, unknown>
  ): Promise<GamificationInstance | null> {
    const config = await this.getCampaignConfig(campaignId, eventId)
    if (!config || !config.isEnabled) {
      return null
    }

    await config.load('event')

    // En mode test, ignorer le cooldown et le pre-flight
    const isTestMode = (customData as { isTest?: boolean })?.isTest === true

    // Pre-flight full mode (blocking) — skip in test mode
    if (!isTestMode) {
      try {
        const runner = await this.getPreFlightRunner()
        const report = await runner?.run({
          campaignId,
          eventType: 'gamification',
          mode: 'full',
          metadata: { eventId, eventSlug: config.event.slug, streamerId, source: 'manual_trigger' },
        })

        if (report && !report.healthy) {
          logger.warn(
            {
              event: 'manual_trigger_preflight_failed',
              campaignId,
              eventId,
              failedChecks: report.checks.filter((c) => c.status === 'fail').map((c) => c.name),
            },
            'Pre-flight failed for manual trigger'
          )
          return null
        }
      } catch (err) {
        logger.warn({ err }, 'Pre-flight runner unavailable, proceeding without check')
      }
    }

    if (!isTestMode) {
      // Vérifier le cooldown uniquement si ce n'est pas un test
      const cooldownStatus = await this.instanceManager.isOnCooldown(
        campaignId,
        eventId,
        config.event.type === 'individual' ? streamerId : undefined
      )

      if (cooldownStatus.onCooldown) {
        logger.warn(
          {
            event: 'manual_trigger_on_cooldown',
            campaignId,
            eventId,
          },
          'Tentative de déclenchement manuel pendant le cooldown'
        )
        return null
      }
    } else {
      logger.info(
        {
          event: 'manual_trigger_test_mode',
          campaignId,
          eventId,
        },
        'Mode test: cooldown ignoré'
      )
    }

    const campaign = await Campaign.findOrFail(campaignId)

    const instance = await this.instanceManager.createIndividual({
      campaign,
      event: config.event,
      config,
      streamerId,
      streamerName,
      viewerCount,
      triggerData: { custom: customData || {} },
    })

    this.broadcastInstanceCreated(instance, config.event)

    return instance
  }

  // ========================================
  // GESTION DES CONTRIBUTIONS
  // ========================================

  /**
   * Traite une redemption de points de chaîne Twitch
   */
  async onRedemption(redemption: TwitchRedemptionData): Promise<{
    processed: boolean
    instance?: GamificationInstance
    objectiveReached?: boolean
  }> {
    // Trouver la config associée au reward
    const config = await CampaignGamificationConfig.query()
      .where('twitchRewardId', redemption.rewardId)
      .where('isEnabled', true)
      .preload('event')
      .first()

    if (!config) {
      logger.debug(
        {
          event: 'redemption_no_config',
          rewardId: redemption.rewardId,
        },
        'Redemption pour un reward non configuré'
      )
      return { processed: false }
    }

    // Trouver l'instance active
    const instance = await this.instanceManager.getActiveInstanceForStreamer(
      config.campaignId,
      redemption.streamerId
    )

    if (!instance) {
      logger.warn(
        {
          event: 'redemption_no_active_instance',
          rewardId: redemption.rewardId,
          streamerId: redemption.streamerId,
        },
        'Redemption sans instance active'
      )
      return { processed: false }
    }

    // Ajouter la contribution
    const contribution: ContributionData = {
      streamerId: redemption.streamerId,
      twitchUserId: redemption.twitchUserId,
      twitchUsername: redemption.twitchUsername,
      amount: redemption.amount,
      twitchRedemptionId: redemption.redemptionId,
    }

    const { instance: updatedInstance, objectiveReached } =
      await this.instanceManager.addContribution(instance.id, contribution)

    // Broadcast la progression
    this.broadcastProgress(updatedInstance, redemption.twitchUsername)

    // Si l'objectif est atteint, compléter l'instance
    if (objectiveReached) {
      // TODO: Récupérer le connectionId de la VTT connection
      const connectionId = await this.getVttConnectionId(config.campaignId)

      if (connectionId) {
        await this.instanceManager.complete(updatedInstance, config.event, config, connectionId)
        this.broadcastInstanceCompleted(updatedInstance)
      } else {
        logger.error(
          {
            event: 'no_vtt_connection',
            campaignId: config.campaignId,
            instanceId: updatedInstance.id,
          },
          "Pas de connexion VTT pour exécuter l'action"
        )
      }
    }

    return {
      processed: true,
      instance: updatedInstance,
      objectiveReached,
    }
  }

  /**
   * Traite une redemption via le nouveau système StreamerGamificationConfig
   *
   * Flux en deux étapes:
   * 1. ACTIVATION: Premier clic → crée une instance et compte comme contribution
   * 2. REMPLISSAGE: Clics suivants → ajoutent des contributions
   * 3. ARMED: Objectif atteint → instance passe en état "armed" (en attente d'un critique)
   *
   * Note: Le cooldown est géré entre 'completed' et la prochaine activation
   */
  async onStreamerRedemption(redemption: StreamerRedemptionData): Promise<{
    processed: boolean
    instance?: GamificationInstance
    isNewInstance?: boolean
    objectiveReached?: boolean
    isArmed?: boolean
  }> {
    // Pre-flight light mode (non-blocking, observability only)
    this.getPreFlightRunner()
      .then((runner) =>
        runner?.run({
          campaignId: redemption.campaignId,
          eventType: 'gamification',
          mode: 'light',
          metadata: { streamerId: redemption.streamerId, source: 'streamer_redemption' },
        })
      )
      .catch((err) => logger.debug({ err }, 'Light pre-flight skipped'))

    // Récupérer la config MJ pour les paramètres de l'événement
    const campaignConfig = await this.getCampaignConfig(redemption.campaignId, redemption.eventId)
    if (!campaignConfig || !campaignConfig.isEnabled) {
      logger.warn(
        {
          event: 'streamer_redemption_config_disabled',
          campaignId: redemption.campaignId,
          eventId: redemption.eventId,
        },
        'Configuration MJ désactivée ou inexistante'
      )
      return { processed: false }
    }

    await campaignConfig.load('event')
    const gamificationEvent = campaignConfig.event

    // Vérifier s'il y a déjà une instance active ou armed pour ce streamer
    let instance = await this.instanceManager.getActiveOrArmedInstanceForStreamer(
      redemption.campaignId,
      redemption.streamerId,
      redemption.eventId
    )

    let isNewInstance = false

    if (!instance) {
      // Pas d'instance active → vérifier le cooldown puis créer une nouvelle instance

      // Vérifier le cooldown (uniquement pour la création, pas les contributions)
      const cooldownStatus = await this.instanceManager.isOnCooldown(
        redemption.campaignId,
        redemption.eventId,
        gamificationEvent.type === 'individual' ? redemption.streamerId : undefined
      )

      if (cooldownStatus.onCooldown) {
        logger.info(
          {
            event: 'streamer_redemption_on_cooldown',
            campaignId: redemption.campaignId,
            eventId: redemption.eventId,
            cooldownEndsAt: cooldownStatus.endsAt?.toISO(),
          },
          'Redemption pendant le cooldown - refusée'
        )
        // TODO: Refund automatique via TwitchRewardService
        return { processed: false }
      }

      // Récupérer les infos du streamer pour le nom
      const campaign = await Campaign.findOrFail(redemption.campaignId)

      // Créer la nouvelle instance
      // TODO: Récupérer le viewerCount actuel via TwitchApiService
      const viewerCount = 100 // Placeholder - à récupérer dynamiquement

      instance = await this.instanceManager.createIndividual({
        campaign,
        event: gamificationEvent,
        config: campaignConfig,
        streamerId: redemption.streamerId,
        streamerName: redemption.twitchUsername, // Utiliser le nom du viewer qui déclenche (sera remplacé)
        viewerCount,
        triggerData: {
          activation: {
            triggeredBy: redemption.twitchUsername,
            twitchUserId: redemption.twitchUserId,
            redemptionId: redemption.redemptionId,
          },
        },
      })

      isNewInstance = true

      // Broadcast la création de l'instance
      this.broadcastInstanceCreated(instance, gamificationEvent)

      logger.info(
        {
          event: 'streamer_redemption_instance_created',
          instanceId: instance.id,
          redemptionId: redemption.redemptionId,
          streamerId: redemption.streamerId,
        },
        'Nouvelle instance créée par redemption'
      )
    }

    // Vérifier que l'instance accepte encore des contributions
    if (!instance.acceptsContributions) {
      logger.warn(
        {
          event: 'streamer_redemption_no_contributions',
          instanceId: instance.id,
          status: instance.status,
        },
        "L'instance n'accepte plus de contributions"
      )
      // TODO: Refund automatique
      return { processed: false }
    }

    // Ajouter la contribution (le premier clic compte aussi)
    const contribution: ContributionData = {
      streamerId: redemption.streamerId,
      twitchUserId: redemption.twitchUserId,
      twitchUsername: redemption.twitchUsername,
      amount: redemption.amount,
      twitchRedemptionId: redemption.redemptionId,
    }

    const { instance: updatedInstance, objectiveReached } =
      await this.instanceManager.addContribution(instance.id, contribution)

    // Broadcast la progression
    this.broadcastProgress(updatedInstance, redemption.twitchUsername)

    // Si l'objectif est atteint
    if (objectiveReached && updatedInstance.status === 'active') {
      // Spell & monster actions execute immediately (no ARMED phase)
      const immediateActionTypes = [
        'spell_disable',
        'spell_buff',
        'spell_debuff',
        'monster_buff',
        'monster_debuff',
      ]

      if (immediateActionTypes.includes(gamificationEvent.actionType)) {
        const connectionId = await this.getVttConnectionId(redemption.campaignId)
        if (connectionId) {
          await this.instanceManager.complete(
            updatedInstance,
            gamificationEvent,
            campaignConfig,
            connectionId,
            true
          )

          // Broadcast action result to overlay
          const actionResult = updatedInstance.resultData?.actionResult as
            | Record<string, unknown>
            | undefined
          this.getWebSocketService()
            .then((ws) =>
              ws.emitGamificationActionExecuted({
                instanceId: updatedInstance.id,
                campaignId: redemption.campaignId,
                eventName: gamificationEvent.name,
                actionType: gamificationEvent.actionType,
                success: updatedInstance.resultData?.success ?? false,
                message: updatedInstance.resultData?.message,
                // Spell fields
                spellName: actionResult?.spellName as string | undefined,
                spellImg: actionResult?.spellImg as string | undefined,
                effectDuration: actionResult?.effectDuration as number | undefined,
                buffType: actionResult?.buffType as string | undefined,
                debuffType: actionResult?.debuffType as string | undefined,
                bonusValue: actionResult?.bonusValue as number | undefined,
                penaltyValue: actionResult?.penaltyValue as number | undefined,
                // Monster fields
                monsterName: actionResult?.monsterName as string | undefined,
                monsterImg: actionResult?.monsterImg as string | undefined,
                effectType: actionResult?.effectType as string | undefined,
                acBonus: actionResult?.acBonus as number | undefined,
                acPenalty: actionResult?.acPenalty as number | undefined,
                tempHp: actionResult?.tempHp as number | undefined,
                maxHpReduction: actionResult?.maxHpReduction as number | undefined,
                highlightColor: actionResult?.highlightColor as string | undefined,
              })
            )
            .catch((err) => {
              logger.error({ err }, 'Failed to emit gamification:action_executed')
            })

          logger.info(
            {
              event: 'streamer_redemption_immediate_execute',
              instanceId: updatedInstance.id,
              campaignId: redemption.campaignId,
              actionType: gamificationEvent.actionType,
            },
            'Action exécutée immédiatement (pas de phase armed)'
          )
        } else {
          logger.warn(
            {
              event: 'streamer_redemption_no_vtt_connection',
              instanceId: updatedInstance.id,
              campaignId: redemption.campaignId,
            },
            "Pas de connexion VTT pour exécuter l'action"
          )
        }

        return {
          processed: true,
          instance: updatedInstance,
          isNewInstance,
          objectiveReached: true,
          isArmed: false,
        }
      }

      // Default flow: arm and wait for critical roll
      await this.instanceManager.armInstance(updatedInstance)

      // Broadcast l'état armed
      this.broadcastInstanceArmed(updatedInstance)

      logger.info(
        {
          event: 'streamer_redemption_armed',
          instanceId: updatedInstance.id,
          campaignId: redemption.campaignId,
        },
        'Instance armée - en attente de jet critique'
      )

      return {
        processed: true,
        instance: updatedInstance,
        isNewInstance,
        objectiveReached: true,
        isArmed: true,
      }
    }

    return {
      processed: true,
      instance: updatedInstance,
      isNewInstance,
      objectiveReached,
      isArmed: updatedInstance.status === 'armed',
    }
  }

  /**
   * Récupère l'ID de connexion VTT pour une campagne
   */
  private async getVttConnectionId(campaignId: string): Promise<string | null> {
    const campaign = await Campaign.query().where('id', campaignId).preload('vttConnection').first()

    if (!campaign) {
      logger.warn({ event: 'get_vtt_connection_no_campaign', campaignId }, 'Campagne non trouvée')
      return null
    }

    // Accéder directement à vttConnectionId car le preload peut ne pas fonctionner si null
    if (campaign.vttConnectionId) {
      return campaign.vttConnectionId
    }

    logger.warn(
      { event: 'get_vtt_connection_none', campaignId, vttConnectionId: campaign.vttConnectionId },
      'Pas de connexion VTT pour cette campagne'
    )
    return null
  }

  // ========================================
  // GESTION DES INSTANCES
  // ========================================

  /**
   * Récupère les instances actives d'une campagne
   */
  async getActiveInstances(campaignId: string): Promise<GamificationInstance[]> {
    return this.instanceManager.getActiveInstances(campaignId)
  }

  /**
   * Récupère l'instance active pour un streamer (pour l'overlay)
   */
  async getActiveInstanceForStreamer(
    campaignId: string,
    streamerId: string
  ): Promise<GamificationInstance | null> {
    return this.instanceManager.getActiveInstanceForStreamer(campaignId, streamerId)
  }

  /**
   * Annule une instance
   */
  async cancelInstance(instanceId: string): Promise<GamificationInstance> {
    const instance = await GamificationInstance.findOrFail(instanceId)
    const cancelled = await this.instanceManager.cancel(instance)
    this.broadcastInstanceCancelled(cancelled)
    return cancelled
  }

  /**
   * Force le passage en état "armed" d'une instance (pour les tests DEV/STAGING)
   * Simule l'atteinte de l'objectif et arme l'instance (en attente d'un jet critique)
   */
  async forceCompleteInstance(instanceId: string): Promise<GamificationInstance> {
    const instance = await GamificationInstance.findOrFail(instanceId)
    await instance.load('event')

    // Mettre la progression à 100%
    instance.currentProgress = instance.objectiveTarget
    await instance.save()

    // Passer en état armed (en attente d'un jet critique)
    await this.instanceManager.armInstance(instance)

    // Broadcast la progression à 100% puis l'état armed
    this.broadcastProgress(instance, 'test_force')
    this.broadcastInstanceArmed(instance)

    logger.info(
      {
        event: 'force_armed_instance',
        instanceId: instance.id,
        campaignId: instance.campaignId,
      },
      'Instance forcée en état armed (test)'
    )

    return instance
  }

  /**
   * Reset les cooldowns au lancement d'une session
   */
  async onSessionStart(campaignId: string): Promise<void> {
    await this.instanceManager.resetCooldowns(campaignId)

    logger.info(
      {
        event: 'session_start_cooldowns_reset',
        campaignId,
      },
      'Cooldowns réinitialisés au lancement de session'
    )
  }

  /**
   * Reset les cooldowns encore actifs (production-safe, outils MJ)
   * Filtre optionnel par streamer
   */
  async resetCooldownsForMj(campaignId: string, streamerId?: string): Promise<number> {
    const count = await this.instanceManager.resetCooldownsFiltered(campaignId, streamerId)

    logger.info(
      {
        event: 'gamification_cooldowns_reset_mj',
        campaignId,
        streamerId: streamerId || 'all',
        count,
      },
      'Cooldowns réinitialisés par le MJ'
    )

    return count
  }

  /**
   * Annule toutes les instances actives/armées (production-safe, outils MJ)
   * Boucle individuellement pour émettre un broadcast WebSocket par instance
   */
  async cancelAllActiveInstances(campaignId: string, streamerId?: string): Promise<number> {
    const query = GamificationInstance.query()
      .where('campaignId', campaignId)
      .whereIn('status', ['active', 'armed'])

    if (streamerId) {
      query.where('streamerId', streamerId)
    }

    const instances = await query

    for (const instance of instances) {
      const cancelled = await this.instanceManager.cancel(instance)
      this.broadcastInstanceCancelled(cancelled)
    }

    logger.info(
      {
        event: 'gamification_instances_bulk_cancelled',
        campaignId,
        streamerId: streamerId || 'all',
        count: instances.length,
      },
      'Instances annulées en masse par le MJ'
    )

    return instances.length
  }

  /**
   * Envoie une commande de nettoyage global à Foundry VTT
   * Supprime tous les flags Tumulte (sorts désactivés, buffs/debuffs), restaure les sorts,
   * annule les timers, et optionnellement nettoie les messages chat.
   *
   * Commande fire-and-forget : le backend envoie et retourne immédiatement.
   */
  async cleanupFoundryEffects(
    campaignId: string,
    cleanChat: boolean
  ): Promise<{ success: boolean; error?: string }> {
    const connectionId = await this.getVttConnectionId(campaignId)
    if (!connectionId) {
      return {
        success: false,
        error: 'Aucune connexion VTT active pour cette campagne',
      }
    }

    const foundryAdapter = await app.container.make('foundryCommandAdapter')
    const result = await foundryAdapter.cleanupAllEffects(connectionId, { cleanChat })

    logger.info(
      {
        event: 'foundry_cleanup_requested',
        campaignId,
        connectionId,
        cleanChat,
        success: result.success,
      },
      'Nettoyage Foundry demandé par le MJ'
    )

    return result
  }

  // ========================================
  // WEBSOCKET BROADCASTS
  // ========================================

  /**
   * Broadcast la création d'une instance
   */
  private broadcastInstanceCreated(instance: GamificationInstance, event: GamificationEvent): void {
    const channel = `gamification/${instance.campaignId}/instance`

    transmit.broadcast(channel, {
      type: 'instance_created',
      data: {
        instanceId: instance.id,
        eventSlug: event.slug,
        eventName: event.name,
        eventType: event.type,
        objectiveTarget: instance.objectiveTarget,
        duration: instance.duration,
        startsAt: instance.startsAt.toISO(),
        expiresAt: instance.expiresAt.toISO(),
        streamerId: instance.streamerId,
        triggerData: instance.triggerData ? JSON.parse(JSON.stringify(instance.triggerData)) : null,
      },
    })

    // Broadcast vers les overlays streamer
    this.getWebSocketService()
      .then((ws) =>
        ws.emitGamificationStart({
          id: instance.id,
          campaignId: instance.campaignId,
          eventId: instance.eventId,
          event: {
            id: event.id,
            slug: event.slug,
            name: event.name,
            type: event.type,
            actionType: event.actionType,
            rewardColor: event.rewardColor,
          },
          type: instance.type,
          status: instance.status,
          objectiveTarget: instance.objectiveTarget,
          currentProgress: instance.currentProgress,
          progressPercentage: instance.progressPercentage,
          isObjectiveReached: instance.isObjectiveReached,
          duration: instance.duration,
          startsAt: instance.startsAt.toISO() ?? '',
          expiresAt: instance.expiresAt.toISO() ?? '',
          completedAt: instance.completedAt?.toISO() ?? null,
          streamerId: instance.streamerId,
          viewerCountAtStart: instance.viewerCountAtStart,
          triggerData: instance.triggerData
            ? JSON.parse(JSON.stringify(instance.triggerData))
            : null,
        })
      )
      .catch((err) => {
        logger.error({ err }, 'Failed to emit gamification:start to streamer overlays')
      })

    logger.debug(
      {
        event: 'broadcast_instance_created',
        instanceId: instance.id,
        channel,
      },
      'Instance créée broadcastée'
    )
  }

  /**
   * Broadcast la progression d'une instance
   */
  private broadcastProgress(
    instance: GamificationInstance,
    contributorUsername: string = 'anonymous'
  ): void {
    const channel = `gamification/${instance.campaignId}/progress`

    transmit.broadcast(channel, {
      type: 'progress_update',
      data: {
        instanceId: instance.id,
        currentProgress: instance.currentProgress,
        objectiveTarget: instance.objectiveTarget,
        progressPercentage: instance.progressPercentage,
        remainingSeconds: instance.remainingSeconds,
      },
    })

    // Broadcast vers les overlays streamer
    this.getWebSocketService()
      .then((ws) =>
        ws.emitGamificationProgress({
          instanceId: instance.id,
          campaignId: instance.campaignId,
          currentProgress: instance.currentProgress,
          objectiveTarget: instance.objectiveTarget,
          progressPercentage: instance.progressPercentage,
          isObjectiveReached: instance.isObjectiveReached,
          contributorUsername,
        })
      )
      .catch((err) => {
        logger.error({ err }, 'Failed to emit gamification:progress to streamer overlays')
      })
  }

  /**
   * Broadcast la complétion d'une instance
   */
  private broadcastInstanceCompleted(instance: GamificationInstance): void {
    const channel = `gamification/${instance.campaignId}/instance`

    transmit.broadcast(channel, {
      type: 'instance_completed',
      data: {
        instanceId: instance.id,
        resultData: instance.resultData ? JSON.parse(JSON.stringify(instance.resultData)) : null,
        cooldownEndsAt: instance.cooldownEndsAt?.toISO() ?? null,
      },
    })

    // Broadcast vers les overlays streamer
    this.getWebSocketService()
      .then((ws) =>
        ws.emitGamificationComplete({
          instanceId: instance.id,
          campaignId: instance.campaignId,
          success: instance.resultData?.success ?? true,
          message: instance.resultData?.message,
        })
      )
      .catch((err) => {
        logger.error({ err }, 'Failed to emit gamification:complete to streamer overlays')
      })
  }

  /**
   * Broadcast l'annulation d'une instance
   */
  private broadcastInstanceCancelled(instance: GamificationInstance): void {
    const channel = `gamification/${instance.campaignId}/instance`

    transmit.broadcast(channel, {
      type: 'instance_cancelled',
      data: {
        instanceId: instance.id,
      },
    })

    // Broadcast vers les overlays streamer (expire = cancelled pour l'overlay)
    this.getWebSocketService()
      .then((ws) =>
        ws.emitGamificationExpired({
          instanceId: instance.id,
          campaignId: instance.campaignId,
        })
      )
      .catch((err) => {
        logger.error({ err }, 'Failed to emit gamification:expired to streamer overlays')
      })
  }

  /**
   * Broadcast le passage en état "armed" d'une instance
   *
   * Cet événement indique que la jauge est remplie et que le système
   * attend maintenant un jet critique pour consommer l'effet.
   */
  private broadcastInstanceArmed(instance: GamificationInstance): void {
    const channel = `gamification/${instance.campaignId}/instance`

    transmit.broadcast(channel, {
      type: 'instance_armed',
      data: {
        instanceId: instance.id,
        armedAt: instance.armedAt?.toISO() ?? null,
        streamerId: instance.streamerId,
        eventId: instance.eventId,
      },
    })

    // Broadcast vers les overlays streamer
    this.getWebSocketService()
      .then((ws) =>
        ws.emitGamificationArmed({
          instanceId: instance.id,
          campaignId: instance.campaignId,
          armedAt: instance.armedAt?.toISO() ?? null,
          streamerId: instance.streamerId,
          eventId: instance.eventId,
        })
      )
      .catch((err) => {
        logger.error({ err }, 'Failed to emit gamification:armed to streamer overlays')
      })

    logger.debug(
      {
        event: 'broadcast_instance_armed',
        instanceId: instance.id,
        channel,
      },
      'Instance armée broadcastée'
    )
  }

  /**
   * Broadcast la consommation d'une instance armed lors d'un jet critique
   *
   * Cet événement indique que l'action a été exécutée suite à un critique.
   * L'overlay peut afficher une pop-up ou animation spéciale.
   */
  private broadcastInstanceConsumed(
    instance: GamificationInstance,
    diceRollData: DiceRollData
  ): void {
    const channel = `gamification/${instance.campaignId}/instance`

    transmit.broadcast(channel, {
      type: 'instance_consumed',
      data: {
        instanceId: instance.id,
        streamerId: instance.streamerId,
        eventId: instance.eventId,
        completedAt: instance.completedAt?.toISO() ?? null,
        cooldownEndsAt: instance.cooldownEndsAt?.toISO() ?? null,
        resultData: instance.resultData ? JSON.parse(JSON.stringify(instance.resultData)) : null,
        diceRoll: {
          characterName: diceRollData.characterName,
          formula: diceRollData.formula,
          result: diceRollData.result,
          criticalType: diceRollData.criticalType,
        },
      },
    })

    // Broadcast vers les overlays streamer
    this.getWebSocketService()
      .then((ws) =>
        ws.emitGamificationActionExecuted({
          instanceId: instance.id,
          campaignId: instance.campaignId,
          eventName: instance.event?.name ?? 'Gamification',
          actionType: instance.event?.actionType ?? 'custom',
          success: instance.resultData?.success ?? true,
          message: instance.resultData?.message,
          originalValue: diceRollData.result,
          invertedValue:
            diceRollData.result !== undefined
              ? instance.event?.actionConfig?.diceInvert
                ? 21 - diceRollData.result
                : undefined
              : undefined,
        })
      )
      .catch((err) => {
        logger.error({ err }, 'Failed to emit gamification:action_executed to streamer overlays')
      })

    logger.info(
      {
        event: 'broadcast_instance_consumed',
        instanceId: instance.id,
        channel,
        criticalType: diceRollData.criticalType,
      },
      'Instance consommée broadcastée'
    )
  }
}

export default GamificationService
