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
  const mod = await import('#services/twitch_auth_service')
  return new mod.twitchAuthService()
})

app.container.bind('twitchApiService', async () => {
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

// Poll Services
app.container.bind('pollCreationService', async () => {
  const mod = await import('#services/polls/poll_creation_service')
  return app.container.make(mod.pollCreationService)
})

app.container.bind('pollAggregationService', async () => {
  const mod = await import('#services/polls/poll_aggregation_service')
  return app.container.make(mod.pollAggregationService)
})

app.container.bind('pollPollingService', async () => {
  const mod = await import('#services/polls/poll_polling_service')
  return app.container.make(mod.PollPollingService)
})

app.container.bind('pollLifecycleService', async () => {
  const mod = await import('#services/polls/poll_lifecycle_service')
  return app.container.make(mod.pollLifecycleService)
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

// Poll Template Repository
app.container.bind('pollTemplateRepository', async () => {
  const mod = await import('#repositories/poll_template_repository')
  return new mod.pollTemplateRepository()
})

// Poll Session Repository
app.container.bind('pollSessionRepository', async () => {
  const mod = await import('#repositories/poll_session_repository')
  return new mod.pollSessionRepository()
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
      typeof import('#services/twitch_auth_service').twitchAuthService
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
    pollPollingService: InstanceType<
      typeof import('#services/polls/poll_polling_service').PollPollingService
    >
    pollLifecycleService: InstanceType<
      typeof import('#services/polls/poll_lifecycle_service').PollLifecycleService
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
    pollTemplateRepository: InstanceType<
      typeof import('#repositories/poll_template_repository').PollTemplateRepository
    >
    pollSessionRepository: InstanceType<
      typeof import('#repositories/poll_session_repository').PollSessionRepository
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
