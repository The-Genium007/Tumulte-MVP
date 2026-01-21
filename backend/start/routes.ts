/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
| Architecture modulaire avec contrôleurs organisés par domaine.
|
*/

import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const authController = () => import('#controllers/auth_controller')
const supportController = () => import('#controllers/support_controller')

// ==========================================
// Health check & API Info
// ==========================================
router.get('/', async () => {
  return {
    app: 'Twitch Multi-Stream Poll',
    version: '1.0.0',
    status: 'running',
  }
})

router.get('/health', async ({ response }) => {
  return response.ok({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

// ==========================================
// Routes d'authentification
// ==========================================
router
  .group(() => {
    router.get('/twitch/redirect', [authController, 'redirect'])
    // Rate limit OAuth callback to prevent brute force attacks on state
    router
      .get('/twitch/callback', [authController, 'callback'])
      .use(middleware.rateLimit({ maxRequests: 10, windowSeconds: 60, keyPrefix: 'auth_callback' }))
    router
      .post('/logout', [authController, 'logout'])
      .use(middleware.auth({ guards: ['web', 'api'] }))
    router.get('/me', [authController, 'me']).use(middleware.auth({ guards: ['web', 'api'] }))
  })
  .prefix('/auth')

// ==========================================
// Routes MJ (Game Master) - Architecture modulaire
// ==========================================
router
  .group(() => {
    // Campaigns
    router.get('/campaigns', '#controllers/mj/campaigns_controller.index')
    router.post('/campaigns', '#controllers/mj/campaigns_controller.store')
    router.post('/campaigns/import', '#controllers/mj/campaigns_controller.importFromVtt')
    router.get('/campaigns/:id', '#controllers/mj/campaigns_controller.show')
    router.put('/campaigns/:id', '#controllers/mj/campaigns_controller.update')
    router.delete('/campaigns/:id', '#controllers/mj/campaigns_controller.destroy')
    // Rate limited to prevent invitation spam
    router
      .post('/campaigns/:id/invite', '#controllers/mj/campaigns_controller.invite')
      .use(
        middleware.rateLimit({ maxRequests: 30, windowSeconds: 60, keyPrefix: 'campaign_invite' })
      )
    router.get('/campaigns/:id/members', '#controllers/mj/campaigns_controller.listMembers')
    router.get('/campaigns/:id/live-status', '#controllers/mj/campaigns_controller.liveStatus')
    router.get(
      '/campaigns/:id/streamers/readiness',
      '#controllers/mj/campaigns_controller.streamersReadiness'
    )
    router.post(
      '/campaigns/:id/notify-unready',
      '#controllers/mj/campaigns_controller.notifyUnready'
    )
    router.delete(
      '/campaigns/:id/members/:memberId',
      '#controllers/mj/campaigns_controller.removeMember'
    )

    // Polls (templates liés directement aux campagnes)
    // CRUD des polls (templates de sondages)
    router.get('/campaigns/:campaignId/polls', '#controllers/mj/polls_controller.indexByCampaign')
    router.post('/campaigns/:campaignId/polls', '#controllers/mj/polls_controller.store')
    router.get('/polls/:id', '#controllers/mj/polls_controller.show')
    router.put('/polls/:id', '#controllers/mj/polls_controller.update')
    router.delete('/polls/:id', '#controllers/mj/polls_controller.destroy')

    // Lancement d'un poll depuis son template - Rate limited
    router
      .post('/polls/:id/launch', '#controllers/mj/polls_controller.launchFromPoll')
      .use(middleware.rateLimit({ maxRequests: 20, windowSeconds: 60, keyPrefix: 'poll_launch' }))

    // Contrôle des poll instances
    router.post('/polls/:id/cancel', '#controllers/mj/polls_controller.cancel')
    router.get('/polls/:id/results', '#controllers/mj/polls_controller.results')
    router.get('/polls/:id/live', '#controllers/mj/polls_controller.live')
    router.get('/polls/:id/instance', '#controllers/mj/polls_controller.showInstance')

    // Poll instances (legacy - pour compatibilité)
    router.get('/campaigns/:campaignId/polls/instances', '#controllers/mj/polls_controller.index')
    router
      .post('/campaigns/:campaignId/polls/launch', '#controllers/mj/polls_controller.launch')
      .use(
        middleware.rateLimit({
          maxRequests: 20,
          windowSeconds: 60,
          keyPrefix: 'poll_launch_legacy',
        })
      )

    // VTT Connections - Static routes FIRST (before :id routes)
    router.get('/vtt-connections', '#controllers/mj/vtt_connections_controller.index')
    router.post('/vtt-connections', '#controllers/mj/vtt_connections_controller.store')
    router.get('/vtt-connections/sync-all', '#controllers/mj/vtt_connections_controller.syncAll')
    router.get('/vtt-providers', '#controllers/mj/vtt_connections_controller.listProviders')

    // VTT Secure Pairing - Code-based pairing (static routes must be before :id)
    router.post(
      '/vtt-connections/pair-with-code',
      '#controllers/mj/vtt_connections_controller.pairWithCode'
    )
    // Note: refresh-token is now outside this authenticated group (see below)

    // VTT Connections - Dynamic :id routes AFTER static routes
    router.get('/vtt-connections/:id', '#controllers/mj/vtt_connections_controller.show')
    router.put('/vtt-connections/:id', '#controllers/mj/vtt_connections_controller.update')
    router.delete('/vtt-connections/:id', '#controllers/mj/vtt_connections_controller.destroy')
    router.post(
      '/vtt-connections/:id/regenerate-key',
      '#controllers/mj/vtt_connections_controller.regenerateApiKey'
    )
    router.post(
      '/vtt-connections/:id/sync-campaigns',
      '#controllers/mj/vtt_connections_controller.syncCampaigns'
    )
    router.post('/vtt-connections/:id/revoke', '#controllers/mj/vtt_connections_controller.revoke')

    // Streamers (recherche Twitch)
    router.get('/streamers', '#controllers/mj/streamers_controller.index')
    router.get('/streamers/search', '#controllers/mj/streamers_controller.search')
  })
  .prefix('/mj')
  .use(middleware.auth({ guards: ['web', 'api'] }))
  .use(middleware.validateUuid())

// ==========================================
// Routes VTT Publiques (sans authentification utilisateur)
// Ces routes utilisent leur propre validation JWT via refresh token
// ==========================================
router.post(
  '/mj/vtt-connections/refresh-token',
  '#controllers/mj/vtt_connections_controller.refreshToken'
)

// ==========================================
// Routes Streamer - Architecture modulaire
// ==========================================
router
  .group(() => {
    // Campaigns & Invitations
    router.get('/campaigns/invitations', '#controllers/streamer/campaigns_controller.invitations')
    router.post(
      '/campaigns/invitations/:id/accept',
      '#controllers/streamer/campaigns_controller.acceptInvitation'
    )
    router.post(
      '/campaigns/invitations/:id/decline',
      '#controllers/streamer/campaigns_controller.declineInvitation'
    )
    router.get('/campaigns', '#controllers/streamer/campaigns_controller.index')
    router.post('/campaigns/:id/leave', '#controllers/streamer/campaigns_controller.leave')

    // Authorization (double validation system)
    router.get(
      '/campaigns/authorization-status',
      '#controllers/streamer/authorization_controller.status'
    )
    router.post(
      '/campaigns/:campaignId/authorize',
      '#controllers/streamer/authorization_controller.grant'
    )
    router.delete(
      '/campaigns/:campaignId/authorize',
      '#controllers/streamer/authorization_controller.revoke'
    )

    // Revoke Twitch access
    router.post('/revoke', '#controllers/streamer/authorization_controller.revokeAccess')

    // Overlay URL
    router.get('/overlay-url', '#controllers/streamer/campaigns_controller.getOverlayUrl')

    // Characters (VTT Integration)
    router.get(
      '/campaigns/:campaignId/characters',
      '#controllers/streamer/characters_controller.index'
    )
    router.post(
      '/campaigns/:campaignId/characters/:characterId/assign',
      '#controllers/streamer/characters_controller.assign'
    )
    router.delete(
      '/campaigns/:campaignId/characters/unassign',
      '#controllers/streamer/characters_controller.unassign'
    )

    // Campaign Settings (Character Assignment & Overlay)
    router.get(
      '/campaigns/:campaignId/settings',
      '#controllers/streamer/campaigns_controller.getSettings'
    )
    router.put(
      '/campaigns/:campaignId/character',
      '#controllers/streamer/campaigns_controller.updateCharacter'
    )
    router.put(
      '/campaigns/:campaignId/overlay',
      '#controllers/streamer/campaigns_controller.updateOverlay'
    )
    router.get(
      '/campaigns/:campaignId/available-overlays',
      '#controllers/streamer/campaigns_controller.getAvailableOverlays'
    )

    // Overlay Studio - Configurations (avec rate limiting sur les mutations)
    router.get(
      '/overlay-studio/configs',
      '#controllers/overlay-studio/overlay_studio_controller.index'
    )
    router
      .post(
        '/overlay-studio/configs',
        '#controllers/overlay-studio/overlay_studio_controller.store'
      )
      .use(middleware.rateLimit())
    router.get(
      '/overlay-studio/configs/:id',
      '#controllers/overlay-studio/overlay_studio_controller.show'
    )
    router
      .put(
        '/overlay-studio/configs/:id',
        '#controllers/overlay-studio/overlay_studio_controller.update'
      )
      .use(middleware.rateLimit())
    router
      .delete(
        '/overlay-studio/configs/:id',
        '#controllers/overlay-studio/overlay_studio_controller.destroy'
      )
      .use(middleware.rateLimit())
    router
      .post(
        '/overlay-studio/configs/:id/activate',
        '#controllers/overlay-studio/overlay_studio_controller.activate'
      )
      .use(middleware.rateLimit())
    // Preview command - synchronisation overlay OBS (rate limited)
    router
      .post(
        '/overlay-studio/preview-command',
        '#controllers/overlay-studio/overlay_studio_controller.sendPreviewCommand'
      )
      .use(middleware.rateLimit())
  })
  .prefix('/streamer')
  .use(middleware.auth({ guards: ['web', 'api'] }))
  .use(middleware.validateUuid())

// ==========================================
// Routes Overlay (publiques, sans authentification)
// ==========================================
router
  .group(() => {
    router.get('/:streamerId', '#controllers/streamer/overlay_controller.streamerInfo')
    router.get('/:streamerId/active-poll', '#controllers/streamer/overlay_controller.activePoll')
    router.get(
      '/:streamerId/poll/:pollInstanceId',
      '#controllers/streamer/overlay_controller.pollResults'
    )
    // Overlay Studio - Config active (public)
    router.get(
      '/:streamerId/config',
      '#controllers/overlay-studio/overlay_studio_controller.getActiveConfig'
    )
  })
  .prefix('/overlay')
  .use(middleware.validateUuid())
// Pas de middleware auth - routes publiques pour OBS

// ==========================================
// Routes Account (accessible à tous les rôles authentifiés)
// ==========================================
router
  .group(() => {
    router.delete('/delete', '#controllers/account_controller.deleteAccount')
  })
  .prefix('/account')
  .use(middleware.auth({ guards: ['web', 'api'] }))

// ==========================================
// Routes Support (accessible à tous les rôles authentifiés)
// ==========================================
router
  .group(() => {
    router.post('/report', [supportController, 'report'])
    router.post('/suggestion', [supportController, 'suggestion'])
    router.get('/logs', [supportController, 'getLogs'])
  })
  .prefix('/support')
  .use(middleware.auth({ guards: ['web', 'api'] }))

// ==========================================
// Routes Notifications Push (accessible à tous les rôles authentifiés)
// ==========================================
router
  .group(() => {
    router.get('/vapid-public-key', '#controllers/notifications_controller.vapidPublicKey')
    router.post('/subscribe', '#controllers/notifications_controller.subscribe')
    router.delete('/subscribe', '#controllers/notifications_controller.unsubscribe')
    router.get('/subscriptions', '#controllers/notifications_controller.listSubscriptions')
    router.delete('/subscriptions/:id', '#controllers/notifications_controller.deleteSubscription')
    router.get('/preferences', '#controllers/notifications_controller.getPreferences')
    router.put('/preferences', '#controllers/notifications_controller.updatePreferences')
    router.post('/test', '#controllers/notifications_controller.sendTestNotification')
  })
  .prefix('/notifications')
  .use(middleware.auth({ guards: ['web', 'api'] }))

// ==========================================
// Routes VTT Webhooks (publiques, auth via Bearer token)
// ==========================================
router
  .group(() => {
    // Rate limited pour éviter les abus
    router
      .post('/dice-roll', '#controllers/webhooks/vtt_controller.diceRoll')
      .use(middleware.rateLimit({ maxRequests: 100, windowSeconds: 60, keyPrefix: 'vtt_webhook' }))
    router.post('/test', '#controllers/webhooks/vtt_controller.test')
  })
  .prefix('/webhooks/vtt')
// Pas de middleware auth - authentification via Bearer token dans le controller

// Foundry VTT Webhooks (public, auth via API key)
router
  .group(() => {
    // Pairing flow endpoints (called by Foundry module)
    router.post(
      '/request-pairing',
      '#controllers/webhooks/foundry_webhook_controller.requestPairing'
    )
    router.get('/pairing-status', '#controllers/webhooks/foundry_webhook_controller.pairingStatus')

    // Connection management
    router.post('/revoke', '#controllers/webhooks/foundry_webhook_controller.revoke')
    router.post('/ping', '#controllers/webhooks/foundry_webhook_controller.ping')
    router.post('/status', '#controllers/webhooks/foundry_webhook_controller.status')

    // Connection health check (for resilience)
    router.get(
      '/connection-health',
      '#controllers/webhooks/foundry_webhook_controller.connectionHealth'
    )
  })
  .prefix('/webhooks/foundry')

// ==========================================
// Transmit WebSocket routes
// ==========================================
import transmit from '@adonisjs/transmit/services/main'
transmit.registerRoutes()
