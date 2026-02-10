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

app.container.singleton('gamificationService', async () => {
  const mod = await import('#services/gamification/gamification_service')
  const gamificationService = await app.container.make(mod.GamificationService)

  // Injecter le FoundryCommandAdapter
  const foundryCommandAdapter = await app.container.make('foundryCommandAdapter')
  gamificationService.setFoundryCommandService(foundryCommandAdapter)

  return gamificationService
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
    gamificationService: InstanceType<
      typeof import('#services/gamification/gamification_service').GamificationService
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
  }
}
