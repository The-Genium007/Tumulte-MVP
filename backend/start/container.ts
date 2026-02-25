/**
 * Container IoC (Inversion of Control)
 * Configure l'injection de dépendances pour les services et repositories
 */

import app from '@adonisjs/core/services/app'
import { HttpContext } from '@adonisjs/core/http'
import { configProvider } from '@adonisjs/core'

/*
|--------------------------------------------------------------------------
| Ally Provider Manual Boot
|--------------------------------------------------------------------------
| The Ally provider doesn't seem to boot automatically in some cases.
| This ensures the ally getter is added to HttpContext.
*/
app.booted(async () => {
  const existingDescriptor = Object.getOwnPropertyDescriptor(HttpContext.prototype, 'ally')
  if (!existingDescriptor) {
    try {
      const { AllyManager } = await import('@adonisjs/ally')
      const allyConfigProvider = app.config.get<any>('ally')

      if (allyConfigProvider) {
        const config = await configProvider.resolve<any>(app, allyConfigProvider)
        if (config) {
          HttpContext.getter(
            'ally',
            function (this: HttpContext) {
              return new AllyManager(config, this) as any
            },
            true
          )
          console.log('[Container] Ally initialized successfully')
        }
      }
    } catch (error) {
      console.error('[Container] Failed to initialize ally:', error)
    }
  }
})

/*
|--------------------------------------------------------------------------
| Services
|--------------------------------------------------------------------------
*/

// Cache Service
app.container.singleton('redisService', async () => {
  const mod = await import('#services/cache/redis_service')
  return new mod.redisService()
})

// Campaign Services
app.container.bind('campaignService', async () => {
  const mod = await import('#services/campaigns/campaign_service')
  return app.container.make(mod.CampaignService)
})

app.container.bind('membershipService', async () => {
  const mod = await import('#services/campaigns/membership_service')
  return app.container.make(mod.membershipService)
})

// Readiness Service (streamer readiness checks for campaigns)
app.container.bind('readinessService', async () => {
  const mod = await import('#services/campaigns/readiness_service')
  return app.container.make(mod.ReadinessService)
})

// Live Status Service (Twitch live status with Redis cache)
app.container.bind('liveStatusService', async () => {
  const mod = await import('#services/twitch/live_status_service')
  return app.container.make(mod.LiveStatusService)
})

// Campaign Events Service (aggregates poll + gamification events)
app.container.bind('campaignEventsService', async () => {
  const mod = await import('#services/campaign_events_service')
  return app.container.make(mod.CampaignEventsService)
})

// Health Check Service (pre-flight system health checks)
app.container.bind('healthCheckService', async () => {
  const mod = await import('#services/core/health_check_service')
  return app.container.make(mod.HealthCheckService)
})

// Push Notification Service (Web Push via VAPID)
app.container.bind('pushNotificationService', async () => {
  const mod = await import('#services/notifications/push_notification_service')
  return new mod.PushNotificationService()
})

// Twitch Services
app.container.bind('twitchAuthService', async () => {
  const mod = await import('#services/auth/twitch_auth_service')
  return new mod.twitchAuthService()
})

// Singleton pour réutiliser le token d'application Twitch entre les requêtes
app.container.singleton('twitchApiService', async () => {
  const mod = await import('#services/twitch/twitch_api_service')
  return new mod.twitchApiService()
})

app.container.bind('twitchPollService', async () => {
  const mod = await import('#services/twitch/twitch_poll_service')
  return new mod.twitchPollService()
})

app.container.singleton('twitchChatService', async () => {
  const mod = await import('#services/twitch/twitch_chat_service')
  const redisService = await app.container.make('redisService')
  return new mod.twitchChatService(redisService)
})

app.container.singleton('twitchChatCountdownService', async () => {
  const mod = await import('#services/twitch/twitch_chat_countdown_service')
  const chatService = await app.container.make('twitchChatService')
  return new mod.twitchChatCountdownService(chatService)
})

// Singleton pour réutiliser les subscriptions EventSub entre les requêtes
app.container.singleton('twitchEventSubService', async () => {
  const mod = await import('#services/twitch/twitch_eventsub_service')
  const twitchApiService = await app.container.make('twitchApiService')
  return new mod.TwitchEventSubService(twitchApiService)
})

// WebSocket Service
app.container.singleton('webSocketService', async () => {
  const mod = await import('#services/websocket/websocket_service')
  return new mod.webSocketService()
})

// VTT WebSocket Service
app.container.singleton('vttWebSocketService', async () => {
  const mod = await import('#services/vtt/vtt_websocket_service')
  return new mod.default()
})

// Gamification Services
app.container.singleton('foundryCommandAdapter', async () => {
  const mod = await import('#services/gamification/foundry_command_adapter')
  const vttWebSocketService = await app.container.make('vttWebSocketService')
  return new mod.FoundryCommandAdapter(vttWebSocketService)
})

// Gamification Handler Registries (singletons — live for app lifetime)
app.container.singleton('triggerHandlerRegistry', async () => {
  const mod = await import('#services/gamification/handlers/trigger_handler_registry')
  const registry = new mod.TriggerHandlerRegistry()

  const { DiceCriticalTrigger } =
    await import('#services/gamification/handlers/triggers/dice_critical_trigger')
  const { ManualTrigger } = await import('#services/gamification/handlers/triggers/manual_trigger')
  const { CustomTrigger } = await import('#services/gamification/handlers/triggers/custom_trigger')

  registry.register(new DiceCriticalTrigger())
  registry.register(new ManualTrigger())
  registry.register(new CustomTrigger())

  return registry
})

app.container.singleton('actionHandlerRegistry', async () => {
  const mod = await import('#services/gamification/handlers/action_handler_registry')
  const registry = new mod.ActionHandlerRegistry()

  const { DiceInvertAction } =
    await import('#services/gamification/handlers/actions/dice_invert_action')
  const { ChatMessageAction } =
    await import('#services/gamification/handlers/actions/chat_message_action')
  const { StatModifyAction } =
    await import('#services/gamification/handlers/actions/stat_modify_action')
  const { CustomAction } = await import('#services/gamification/handlers/actions/custom_action')
  const { SpellDisableAction } =
    await import('#services/gamification/handlers/actions/spell_disable_action')
  const { SpellBuffAction } =
    await import('#services/gamification/handlers/actions/spell_buff_action')
  const { SpellDebuffAction } =
    await import('#services/gamification/handlers/actions/spell_debuff_action')
  const { MonsterBuffAction } =
    await import('#services/gamification/handlers/actions/monster_buff_action')
  const { MonsterDebuffAction } =
    await import('#services/gamification/handlers/actions/monster_debuff_action')

  registry.register(new DiceInvertAction())
  registry.register(new ChatMessageAction())
  registry.register(new StatModifyAction())
  registry.register(new CustomAction())
  registry.register(new SpellDisableAction())
  registry.register(new SpellBuffAction())
  registry.register(new SpellDebuffAction())
  registry.register(new MonsterBuffAction())
  registry.register(new MonsterDebuffAction())

  return registry
})

// RewardManagerService avec injection du TwitchEventSubService
app.container.bind('rewardManagerService', async () => {
  const mod = await import('#services/gamification/reward_manager_service')
  const rewardManager = await app.container.make(mod.RewardManagerService)

  // Injecter le TwitchEventSubService
  const twitchEventSubService = await app.container.make('twitchEventSubService')
  rewardManager.setEventSubService(twitchEventSubService)

  return rewardManager
})

// CombatRewardToggleService — toggle des rewards Twitch selon l'état du combat
app.container.bind('combatRewardToggleService', async () => {
  const mod = await import('#services/gamification/combat_reward_toggle_service')
  return app.container.make(mod.CombatRewardToggleService)
})

// GamificationAuthBridge avec injection du TwitchEventSubService
app.container.bind('gamificationAuthBridge', async () => {
  const mod = await import('#services/gamification/gamification_auth_bridge')
  const streamerConfigMod = await import('#repositories/streamer_gamification_config_repository')
  const campaignConfigMod = await import('#repositories/gamification_config_repository')
  const twitchRewardMod = await import('#services/twitch/twitch_reward_service')

  const rewardManager = await app.container.make('rewardManagerService')
  const streamerConfigRepo = await app.container.make(
    streamerConfigMod.StreamerGamificationConfigRepository
  )
  const campaignConfigRepo = await app.container.make(
    campaignConfigMod.GamificationConfigRepository
  )
  const twitchRewardService = await app.container.make(twitchRewardMod.TwitchRewardService)

  const bridge = new mod.GamificationAuthBridge(
    rewardManager,
    streamerConfigRepo,
    campaignConfigRepo,
    twitchRewardService
  )

  // Injecter le TwitchEventSubService
  const twitchEventSubService = await app.container.make('twitchEventSubService')
  bridge.setEventSubService(twitchEventSubService)

  return bridge
})

// AuthorizationService avec bridge correctement injectée
app.container.bind('authorizationService', async () => {
  const mod = await import('#services/campaigns/authorization_service')
  const membershipMod = await import('#repositories/campaign_membership_repository')

  const membershipRepo = await app.container.make(membershipMod.CampaignMembershipRepository)
  const gamificationBridge = await app.container.make('gamificationAuthBridge')

  return new mod.AuthorizationService(membershipRepo, gamificationBridge)
})

app.container.singleton('gamificationService', async () => {
  const { TriggerEvaluator } = await import('#services/gamification/trigger_evaluator')
  const { ActionExecutor } = await import('#services/gamification/action_executor')
  const { InstanceManager } = await import('#services/gamification/instance_manager')
  const { ObjectiveCalculator } = await import('#services/gamification/objective_calculator')
  const { ExecutionTracker } = await import('#services/gamification/execution_tracker')
  const { GamificationService } = await import('#services/gamification/gamification_service')

  // Wire registries into evaluator/executor
  const triggerRegistry = await app.container.make('triggerHandlerRegistry')
  const actionRegistry = await app.container.make('actionHandlerRegistry')

  const triggerEvaluator = new TriggerEvaluator(triggerRegistry)
  const actionExecutor = new ActionExecutor(actionRegistry)
  const objectiveCalculator = new ObjectiveCalculator()
  const executionTracker = new ExecutionTracker()
  const instanceManager = new InstanceManager(objectiveCalculator, actionExecutor, executionTracker)

  const gamificationService = new GamificationService(
    triggerEvaluator,
    instanceManager,
    actionExecutor
  )

  // Injecter le FoundryCommandAdapter
  const foundryCommandAdapter = await app.container.make('foundryCommandAdapter')
  gamificationService.setFoundryCommandService(foundryCommandAdapter)

  // Injecter le TwitchChatService pour les notifications post-action
  const twitchChatService = await app.container.make('twitchChatService')
  actionExecutor.setTwitchChatNotifier(twitchChatService)

  return gamificationService
})

// PreFlight Services
app.container.singleton('preFlightRegistry', async () => {
  const mod = await import('#services/preflight/preflight_registry')
  const registry = new mod.PreFlightRegistry()

  // Register core checks (priority 0-10: infra + tokens)
  const { RedisCheck } = await import('#services/preflight/checks/redis_check')
  const { WebSocketCheck } = await import('#services/preflight/checks/websocket_check')
  const { TwitchApiCheck } = await import('#services/preflight/checks/twitch_api_check')
  const { TokenCheck } = await import('#services/preflight/checks/token_check')

  registry.register(new RedisCheck())
  registry.register(new WebSocketCheck())
  registry.register(new TwitchApiCheck())
  registry.register(new TokenCheck())

  // Register gamification-specific checks (priority 15-20: connections + business rules)
  const { VttConnectionCheck } = await import('#services/preflight/checks/vtt_connection_check')
  const { CooldownCheck } = await import('#services/preflight/checks/cooldown_check')
  const { GamificationConfigCheck } =
    await import('#services/preflight/checks/gamification_config_check')

  registry.register(new VttConnectionCheck())
  registry.register(new CooldownCheck())
  registry.register(new GamificationConfigCheck())

  return registry
})

// Auto-discover PreFlight checks from handler registries
// Handlers that declare a preFlightCheck() method are automatically registered
app.booted(async () => {
  try {
    const preFlightRegistry = await app.container.make('preFlightRegistry')
    const triggerRegistry = await app.container.make('triggerHandlerRegistry')
    const actionRegistry = await app.container.make('actionHandlerRegistry')

    const allHandlers = [...triggerRegistry.all(), ...actionRegistry.all()]

    for (const handler of allHandlers) {
      if ('preFlightCheck' in handler && typeof handler.preFlightCheck === 'function') {
        preFlightRegistry.register({
          name: `handler:${handler.type}`,
          appliesTo: ['gamification'],
          priority: 20,
          execute: handler.preFlightCheck.bind(handler),
        })
      }
    }

    console.log(`[Container] PreFlight auto-discovery: ${preFlightRegistry.size} checks registered`)
  } catch (error) {
    console.error('[Container] PreFlight auto-discovery failed:', error)
  }
})

app.container.bind('preFlightRunner', async () => {
  const mod = await import('#services/preflight/preflight_runner')
  const registry = await app.container.make('preFlightRegistry')
  return new mod.PreFlightRunner(registry)
})

// Poll Services
app.container.bind('pollCreationService', async () => {
  const mod = await import('#services/polls/poll_creation_service')
  return app.container.make(mod.pollCreationService)
})

app.container.bind('pollAggregationService', async () => {
  const mod = await import('#services/polls/poll_aggregation_service')
  return app.container.make(mod.pollAggregationService)
})

app.container.bind('pollResultsAnnouncementService', async () => {
  const mod = await import('#services/polls/poll_results_announcement_service')
  return app.container.make(mod.pollResultsAnnouncementService)
})

app.container.singleton('pollPollingService', async () => {
  const mod = await import('#services/polls/poll_polling_service')
  const pollChannelLinkRepository = await app.container.make('pollChannelLinkRepository')
  const twitchPollService = await app.container.make('twitchPollService')
  const webSocketService = await app.container.make('webSocketService')
  return new mod.PollPollingService(pollChannelLinkRepository, twitchPollService, webSocketService)
})

app.container.singleton('pollLifecycleService', async () => {
  const mod = await import('#services/polls/poll_lifecycle_service')
  const pollInstanceRepository = await app.container.make('pollInstanceRepository')
  const pollChannelLinkRepository = await app.container.make('pollChannelLinkRepository')
  const pollCreationService = await app.container.make('pollCreationService')
  const pollPollingService = await app.container.make('pollPollingService')
  const pollAggregationService = await app.container.make('pollAggregationService')
  const webSocketService = await app.container.make('webSocketService')
  const pollResultsAnnouncementService = await app.container.make('pollResultsAnnouncementService')
  return new mod.pollLifecycleService(
    pollInstanceRepository,
    pollChannelLinkRepository,
    pollCreationService,
    pollPollingService,
    pollAggregationService,
    webSocketService,
    pollResultsAnnouncementService
  )
})

/*
|--------------------------------------------------------------------------
| Repositories
|--------------------------------------------------------------------------
*/

// User Repository
app.container.bind('userRepository', async () => {
  const mod = await import('#repositories/user_repository')
  return new mod.userRepository()
})

// Streamer Repository
app.container.bind('streamerRepository', async () => {
  const mod = await import('#repositories/streamer_repository')
  return new mod.streamerRepository()
})

// Campaign Repository
app.container.bind('campaignRepository', async () => {
  const mod = await import('#repositories/campaign_repository')
  return new mod.CampaignRepository()
})

// Campaign Membership Repository
app.container.bind('campaignMembershipRepository', async () => {
  const mod = await import('#repositories/campaign_membership_repository')
  return new mod.campaignMembershipRepository()
})

// Poll Repository
app.container.bind('pollRepository', async () => {
  const mod = await import('#repositories/poll_repository')
  return new mod.pollRepository()
})

// Poll Instance Repository
app.container.bind('pollInstanceRepository', async () => {
  const mod = await import('#repositories/poll_instance_repository')
  return new mod.pollInstanceRepository()
})

// Poll Channel Link Repository
app.container.bind('pollChannelLinkRepository', async () => {
  const mod = await import('#repositories/poll_channel_link_repository')
  return new mod.pollChannelLinkRepository()
})

// Poll Result Repository
app.container.bind('pollResultRepository', async () => {
  const mod = await import('#repositories/poll_result_repository')
  return new mod.pollResultRepository()
})

// Criticality Rule Repository
app.container.bind('criticalityRuleRepository', async () => {
  const mod = await import('#repositories/campaign_criticality_rule_repository')
  return new mod.CampaignCriticalityRuleRepository()
})

// Criticality Rule Service
app.container.bind('criticalityRuleService', async () => {
  const mod = await import('#services/campaigns/criticality_rule_service')
  const repository = await app.container.make('criticalityRuleRepository')
  return new mod.CriticalityRuleService(repository)
})

// System Preset Service (applies system-defined criticality rules to campaigns)
app.container.bind('systemPresetService', async () => {
  const mod = await import('#services/campaigns/system_preset_service')
  return new mod.SystemPresetService()
})

// Item Category Rule Repository
app.container.bind('itemCategoryRuleRepository', async () => {
  const mod = await import('#repositories/campaign_item_category_rule_repository')
  return new mod.CampaignItemCategoryRuleRepository()
})

// Item Category Rule Service
app.container.bind('itemCategoryRuleService', async () => {
  const mod = await import('#services/campaigns/item_category_rule_service')
  const repository = await app.container.make('itemCategoryRuleRepository')
  return new mod.ItemCategoryRuleService(repository)
})

// Item Category Detection Service
app.container.bind('itemCategoryDetectionService', async () => {
  const mod = await import('#services/campaigns/item_category_detection_service')
  const repository = await app.container.make('itemCategoryRuleRepository')
  return new mod.ItemCategoryDetectionService(repository)
})

// Gamification Instance Repository
app.container.bind('gamificationInstanceRepository', async () => {
  const mod = await import('#repositories/gamification_instance_repository')
  return new mod.GamificationInstanceRepository()
})

// Gamification Contribution Repository
app.container.bind('gamificationContributionRepository', async () => {
  const mod = await import('#repositories/gamification_contribution_repository')
  return new mod.GamificationContributionRepository()
})

/*
|--------------------------------------------------------------------------
| Export helpers pour typage
|--------------------------------------------------------------------------
*/

declare module '@adonisjs/core/types' {
  interface ContainerBindings {
    // Services
    redisService: InstanceType<typeof import('#services/cache/redis_service').RedisService>
    campaignService: InstanceType<
      typeof import('#services/campaigns/campaign_service').CampaignService
    >
    membershipService: InstanceType<
      typeof import('#services/campaigns/membership_service').MembershipService
    >
    twitchAuthService: InstanceType<
      typeof import('#services/auth/twitch_auth_service').twitchAuthService
    >
    twitchApiService: InstanceType<
      typeof import('#services/twitch/twitch_api_service').twitchApiService
    >
    twitchPollService: InstanceType<
      typeof import('#services/twitch/twitch_poll_service').twitchPollService
    >
    twitchChatService: InstanceType<
      typeof import('#services/twitch/twitch_chat_service').twitchChatService
    >
    twitchChatCountdownService: InstanceType<
      typeof import('#services/twitch/twitch_chat_countdown_service').twitchChatCountdownService
    >
    webSocketService: InstanceType<
      typeof import('#services/websocket/websocket_service').webSocketService
    >
    pollCreationService: InstanceType<
      typeof import('#services/polls/poll_creation_service').PollCreationService
    >
    pollAggregationService: InstanceType<
      typeof import('#services/polls/poll_aggregation_service').PollAggregationService
    >
    pollResultsAnnouncementService: InstanceType<
      typeof import('#services/polls/poll_results_announcement_service').PollResultsAnnouncementService
    >
    pollPollingService: InstanceType<
      typeof import('#services/polls/poll_polling_service').PollPollingService
    >
    pollLifecycleService: InstanceType<
      typeof import('#services/polls/poll_lifecycle_service').PollLifecycleService
    >
    vttWebSocketService: InstanceType<typeof import('#services/vtt/vtt_websocket_service').default>
    foundryCommandAdapter: InstanceType<
      typeof import('#services/gamification/foundry_command_adapter').FoundryCommandAdapter
    >
    twitchEventSubService: InstanceType<
      typeof import('#services/twitch/twitch_eventsub_service').TwitchEventSubService
    >
    rewardManagerService: InstanceType<
      typeof import('#services/gamification/reward_manager_service').RewardManagerService
    >
    combatRewardToggleService: InstanceType<
      typeof import('#services/gamification/combat_reward_toggle_service').CombatRewardToggleService
    >
    gamificationService: InstanceType<
      typeof import('#services/gamification/gamification_service').GamificationService
    >
    gamificationAuthBridge: InstanceType<
      typeof import('#services/gamification/gamification_auth_bridge').GamificationAuthBridge
    >
    authorizationService: InstanceType<
      typeof import('#services/campaigns/authorization_service').AuthorizationService
    >
    triggerHandlerRegistry: InstanceType<
      typeof import('#services/gamification/handlers/trigger_handler_registry').TriggerHandlerRegistry
    >
    actionHandlerRegistry: InstanceType<
      typeof import('#services/gamification/handlers/action_handler_registry').ActionHandlerRegistry
    >
    preFlightRegistry: InstanceType<
      typeof import('#services/preflight/preflight_registry').PreFlightRegistry
    >
    preFlightRunner: InstanceType<
      typeof import('#services/preflight/preflight_runner').PreFlightRunner
    >
    readinessService: InstanceType<
      typeof import('#services/campaigns/readiness_service').ReadinessService
    >
    liveStatusService: InstanceType<
      typeof import('#services/twitch/live_status_service').LiveStatusService
    >
    campaignEventsService: InstanceType<
      typeof import('#services/campaign_events_service').CampaignEventsService
    >
    healthCheckService: InstanceType<
      typeof import('#services/core/health_check_service').HealthCheckService
    >
    pushNotificationService: InstanceType<
      typeof import('#services/notifications/push_notification_service').PushNotificationService
    >

    // Repositories
    userRepository: InstanceType<typeof import('#repositories/user_repository').UserRepository>
    streamerRepository: InstanceType<
      typeof import('#repositories/streamer_repository').StreamerRepository
    >
    campaignRepository: InstanceType<
      typeof import('#repositories/campaign_repository').CampaignRepository
    >
    campaignMembershipRepository: InstanceType<
      typeof import('#repositories/campaign_membership_repository').CampaignMembershipRepository
    >
    pollRepository: InstanceType<typeof import('#repositories/poll_repository').PollRepository>
    pollInstanceRepository: InstanceType<
      typeof import('#repositories/poll_instance_repository').PollInstanceRepository
    >
    pollChannelLinkRepository: InstanceType<
      typeof import('#repositories/poll_channel_link_repository').PollChannelLinkRepository
    >
    pollResultRepository: InstanceType<
      typeof import('#repositories/poll_result_repository').PollResultRepository
    >
    criticalityRuleRepository: InstanceType<
      typeof import('#repositories/campaign_criticality_rule_repository').CampaignCriticalityRuleRepository
    >
    criticalityRuleService: InstanceType<
      typeof import('#services/campaigns/criticality_rule_service').CriticalityRuleService
    >
    systemPresetService: InstanceType<
      typeof import('#services/campaigns/system_preset_service').SystemPresetService
    >
    itemCategoryRuleRepository: InstanceType<
      typeof import('#repositories/campaign_item_category_rule_repository').CampaignItemCategoryRuleRepository
    >
    itemCategoryRuleService: InstanceType<
      typeof import('#services/campaigns/item_category_rule_service').ItemCategoryRuleService
    >
    itemCategoryDetectionService: InstanceType<
      typeof import('#services/campaigns/item_category_detection_service').ItemCategoryDetectionService
    >
    gamificationInstanceRepository: InstanceType<
      typeof import('#repositories/gamification_instance_repository').GamificationInstanceRepository
    >
    gamificationContributionRepository: InstanceType<
      typeof import('#repositories/gamification_contribution_repository').GamificationContributionRepository
    >
  }
}
