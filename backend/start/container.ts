/**
 * Container IoC (Inversion of Control)
 * Configure l'injection de dépendances pour les services et repositories
 */

import app from '@adonisjs/core/services/app'

/*
|--------------------------------------------------------------------------
| Services
|--------------------------------------------------------------------------
*/

// Cache Service
app.container.singleton('RedisService', async () => {
  const { RedisService } = await import('#services/cache/redis_service')
  return new RedisService()
})

// Campaign Services
app.container.bind('CampaignService', async () => {
  const { CampaignService } = await import('#services/campaigns/campaign_service')
  return app.container.make(CampaignService)
})

app.container.bind('MembershipService', async () => {
  const { MembershipService } = await import('#services/campaigns/membership_service')
  return app.container.make(MembershipService)
})

// Twitch Services
app.container.bind('TwitchAuthService', async () => {
  const { default: TwitchAuthService } = await import('#services/twitch/twitch_auth_service')
  return new TwitchAuthService()
})

app.container.bind('TwitchApiService', async () => {
  const { default: TwitchApiService } = await import('#services/twitch/twitch_api_service')
  return new TwitchApiService()
})

app.container.bind('TwitchPollService', async () => {
  const { default: TwitchPollService } = await import('#services/twitch/twitch_poll_service')
  return new TwitchPollService()
})

app.container.singleton('TwitchChatService', async () => {
  const { default: TwitchChatService } = await import('#services/twitch/twitch_chat_service')
  const redisService = await app.container.make('RedisService')
  return new TwitchChatService(redisService)
})

app.container.singleton('TwitchChatCountdownService', async () => {
  const { default: TwitchChatCountdownService } =
    await import('#services/twitch/twitch_chat_countdown_service')
  const chatService = await app.container.make('TwitchChatService')
  return new TwitchChatCountdownService(chatService)
})

// WebSocket Service
app.container.singleton('WebSocketService', async () => {
  const { default: WebSocketService } = await import('#services/websocket/websocket_service')
  return new WebSocketService()
})

// Poll Services
app.container.bind('PollCreationService', async () => {
  const { PollCreationService } = await import('#services/polls/poll_creation_service')
  return app.container.make(PollCreationService)
})

app.container.bind('PollAggregationService', async () => {
  const { PollAggregationService } = await import('#services/polls/poll_aggregation_service')
  return app.container.make(PollAggregationService)
})

app.container.bind('PollPollingService', async () => {
  const { PollPollingService } = await import('#services/polls/poll_polling_service')
  return app.container.make(PollPollingService)
})

app.container.bind('PollLifecycleService', async () => {
  const { PollLifecycleService } = await import('#services/polls/poll_lifecycle_service')
  return app.container.make(PollLifecycleService)
})

/*
|--------------------------------------------------------------------------
| Repositories
|--------------------------------------------------------------------------
*/

// User Repository
app.container.bind('UserRepository', async () => {
  const { UserRepository } = await import('#repositories/user_repository')
  return new UserRepository()
})

// Streamer Repository
app.container.bind('StreamerRepository', async () => {
  const { StreamerRepository } = await import('#repositories/streamer_repository')
  return new StreamerRepository()
})

// Campaign Repository
app.container.bind('CampaignRepository', async () => {
  const { CampaignRepository } = await import('#repositories/campaign_repository')
  return new CampaignRepository()
})

// Campaign Membership Repository
app.container.bind('CampaignMembershipRepository', async () => {
  const { CampaignMembershipRepository } =
    await import('#repositories/campaign_membership_repository')
  return new CampaignMembershipRepository()
})

// Poll Template Repository
app.container.bind('PollTemplateRepository', async () => {
  const { PollTemplateRepository } = await import('#repositories/poll_template_repository')
  return new PollTemplateRepository()
})

// Poll Session Repository
app.container.bind('PollSessionRepository', async () => {
  const { PollSessionRepository } = await import('#repositories/poll_session_repository')
  return new PollSessionRepository()
})

// Poll Repository
app.container.bind('PollRepository', async () => {
  const { PollRepository } = await import('#repositories/poll_repository')
  return new PollRepository()
})

// Poll Instance Repository
app.container.bind('PollInstanceRepository', async () => {
  const { PollInstanceRepository } = await import('#repositories/poll_instance_repository')
  return new PollInstanceRepository()
})

// Poll Channel Link Repository
app.container.bind('PollChannelLinkRepository', async () => {
  const { PollChannelLinkRepository } = await import('#repositories/poll_channel_link_repository')
  return new PollChannelLinkRepository()
})

// Poll Result Repository
app.container.bind('PollResultRepository', async () => {
  const { PollResultRepository } = await import('#repositories/poll_result_repository')
  return new PollResultRepository()
})

/*
|--------------------------------------------------------------------------
| Export helpers pour typage
|--------------------------------------------------------------------------
*/

declare module '@adonisjs/core/types' {
  interface ContainerBindings {
    // Services
    RedisService: InstanceType<typeof import('#services/cache/redis_service').RedisService>
    CampaignService: InstanceType<
      typeof import('#services/campaigns/campaign_service').CampaignService
    >
    MembershipService: InstanceType<
      typeof import('#services/campaigns/membership_service').MembershipService
    >
    TwitchAuthService: import('#services/twitch/twitch_auth_service').default
    TwitchApiService: import('#services/twitch/twitch_api_service').default
    TwitchPollService: import('#services/twitch/twitch_poll_service').default
    TwitchChatService: import('#services/twitch/twitch_chat_service').default
    TwitchChatCountdownService: import('#services/twitch/twitch_chat_countdown_service').default
    WebSocketService: import('#services/websocket/websocket_service').default
    PollCreationService: InstanceType<
      typeof import('#services/polls/poll_creation_service').PollCreationService
    >
    PollAggregationService: InstanceType<
      typeof import('#services/polls/poll_aggregation_service').PollAggregationService
    >
    PollPollingService: InstanceType<
      typeof import('#services/polls/poll_polling_service').PollPollingService
    >
    PollLifecycleService: InstanceType<
      typeof import('#services/polls/poll_lifecycle_service').PollLifecycleService
    >

    // Repositories
    UserRepository: InstanceType<typeof import('#repositories/user_repository').UserRepository>
    StreamerRepository: InstanceType<
      typeof import('#repositories/streamer_repository').StreamerRepository
    >
    CampaignRepository: InstanceType<
      typeof import('#repositories/campaign_repository').CampaignRepository
    >
    CampaignMembershipRepository: InstanceType<
      typeof import('#repositories/campaign_membership_repository').CampaignMembershipRepository
    >
    PollTemplateRepository: InstanceType<
      typeof import('#repositories/poll_template_repository').PollTemplateRepository
    >
    PollSessionRepository: InstanceType<
      typeof import('#repositories/poll_session_repository').PollSessionRepository
    >
    PollRepository: InstanceType<typeof import('#repositories/poll_repository').PollRepository>
    PollInstanceRepository: InstanceType<
      typeof import('#repositories/poll_instance_repository').PollInstanceRepository
    >
    PollChannelLinkRepository: InstanceType<
      typeof import('#repositories/poll_channel_link_repository').PollChannelLinkRepository
    >
    PollResultRepository: InstanceType<
      typeof import('#repositories/poll_result_repository').PollResultRepository
    >
  }
}
