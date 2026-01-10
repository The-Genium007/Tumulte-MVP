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

    // Poll Sessions (nested sous campaigns OU standalone)
    router.get(
      '/campaigns/:campaignId/sessions',
      '#controllers/mj/poll_sessions_controller.indexByCampaign'
    )
    router.post(
      '/campaigns/:campaignId/sessions',
      '#controllers/mj/poll_sessions_controller.storeByCampaign'
    )
    router.delete(
      '/campaigns/:campaignId/sessions/:id',
      '#controllers/mj/poll_sessions_controller.destroy'
    )
    router.get('/sessions/:id', '#controllers/mj/poll_sessions_controller.show')
    router.put('/sessions/:id', '#controllers/mj/poll_sessions_controller.update')
    router.delete('/sessions/:id', '#controllers/mj/poll_sessions_controller.destroy')
    router.post('/sessions/:id/polls', '#controllers/mj/poll_sessions_controller.addPoll')
    router.put('/sessions/:id/polls/:pollId', '#controllers/mj/poll_sessions_controller.updatePoll')
    router.delete(
      '/sessions/:id/polls/:pollId',
      '#controllers/mj/poll_sessions_controller.deletePoll'
    )
    router.put(
      '/sessions/:id/polls/reorder',
      '#controllers/mj/poll_sessions_controller.reorderPolls'
    )

    // Lancement de session avec Health Check
    router.post(
      '/campaigns/:campaignId/sessions/:sessionId/launch',
      '#controllers/mj/poll_sessions_controller.launch'
    )
    // Status de session (validation état frontend/backend)
    router.get(
      '/campaigns/:campaignId/sessions/:sessionId/status',
      '#controllers/mj/poll_sessions_controller.status'
    )
    // Heartbeat de session (synchronisation temps réel)
    router.post(
      '/campaigns/:campaignId/sessions/:sessionId/heartbeat',
      '#controllers/mj/poll_sessions_controller.heartbeat'
    )

    // Poll Templates (nested sous campaigns OU standalone)
    router.get(
      '/campaigns/:campaignId/templates',
      '#controllers/mj/poll_templates_controller.indexByCampaign'
    )
    router.post(
      '/campaigns/:campaignId/templates',
      '#controllers/mj/poll_templates_controller.storeByCampaign'
    )
    router.get('/templates', '#controllers/mj/poll_templates_controller.index')
    router.get('/templates/:id', '#controllers/mj/poll_templates_controller.show')
    router.put('/templates/:id', '#controllers/mj/poll_templates_controller.update')
    router.delete('/templates/:id', '#controllers/mj/poll_templates_controller.destroy')

    // Active Session (récupérer la session/poll en cours)
    router.get('/active-session', '#controllers/mj/active_session_controller.show')

    // Polls (lancement et contrôle) - Rate limited to prevent spam
    router
      .post('/campaigns/:campaignId/polls/launch', '#controllers/mj/polls_controller.launch')
      .use(middleware.rateLimit({ maxRequests: 20, windowSeconds: 60, keyPrefix: 'poll_launch' }))
    router.get('/polls', '#controllers/mj/polls_controller.index')
    router.get('/polls/:id', '#controllers/mj/polls_controller.show')
    router.post('/polls/:id/cancel', '#controllers/mj/polls_controller.cancel')
    router.get('/polls/:id/results', '#controllers/mj/polls_controller.results')
    router.get('/polls/:id/live', '#controllers/mj/polls_controller.live')

    // Streamers (recherche Twitch)
    router.get('/streamers', '#controllers/mj/streamers_controller.index')
    router.get('/streamers/search', '#controllers/mj/streamers_controller.search')
  })
  .prefix('/mj')
  .use(middleware.auth({ guards: ['web', 'api'] }))
  .use(middleware.validateUuid())

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
// Transmit WebSocket routes
// ==========================================
import transmit from '@adonisjs/transmit/services/main'
transmit.registerRoutes()
