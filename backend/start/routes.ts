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

const supportController = () => import('#controllers/support_controller')
const sessionController = () => import('#controllers/auth/session_controller')
const healthController = () => import('#controllers/health_controller')
const metricsController = () => import('#controllers/metrics_controller')

// New auth controllers
const registerController = () => import('#controllers/auth/register_controller')
const loginController = () => import('#controllers/auth/login_controller')
const verificationController = () => import('#controllers/auth/verification_controller')
const passwordController = () => import('#controllers/auth/password_controller')
const oauthController = () => import('#controllers/auth/oauth_controller')

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

// Simple health check for Docker/Kubernetes probes
router.get('/health', [healthController, 'simple'])

// Detailed health check with service status (protected)
router
  .get('/health/details', [healthController, 'details'])
  .use(middleware.auth({ guards: ['web', 'api'] }))

// Readiness probe - checks if app can serve traffic
router.get('/health/ready', [healthController, 'ready'])

// Liveness probe - checks if app is running
router.get('/health/live', [healthController, 'live'])

// Prometheus metrics endpoint (protected - admin only)
router
  .get('/metrics', [metricsController, 'index'])
  .use(middleware.auth({ guards: ['web', 'api'] }))
  .use(middleware.admin())

// ==========================================
// Routes d'authentification
// ==========================================
router
  .group(() => {
    // ---- Email/Password Auth ----
    router
      .post('/register', [registerController, 'handle'])
      .use(middleware.rateLimit({ maxRequests: 5, windowSeconds: 60, keyPrefix: 'auth_register' }))
    router
      .post('/login', [loginController, 'handle'])
      .use(middleware.authLockout())
      .use(middleware.rateLimit({ maxRequests: 10, windowSeconds: 60, keyPrefix: 'auth_login' }))

    // ---- Email Verification ----
    router.post('/verify-email', [verificationController, 'verify']).use(
      middleware.rateLimit({
        maxRequests: 5,
        windowSeconds: 60,
        keyPrefix: 'auth_verify_email',
      })
    )
    router
      .post('/resend-verification', [verificationController, 'resend'])
      .use(middleware.auth({ guards: ['web', 'api'] }))
      .use(
        middleware.rateLimit({
          maxRequests: 3,
          windowSeconds: 60,
          keyPrefix: 'auth_resend_verification',
        })
      )

    // ---- Password Reset ----
    router.post('/forgot-password', [passwordController, 'forgotPassword']).use(
      middleware.rateLimit({
        maxRequests: 3,
        windowSeconds: 60,
        keyPrefix: 'auth_forgot_password',
      })
    )
    router.get('/validate-reset-token', [passwordController, 'validateResetToken'])
    router.post('/reset-password', [passwordController, 'resetPassword'])

    // ---- Password Management (authenticated) ----
    router
      .post('/change-password', [passwordController, 'changePassword'])
      .use(middleware.auth({ guards: ['web', 'api'] }))
    router
      .post('/set-password', [passwordController, 'setPassword'])
      .use(middleware.auth({ guards: ['web', 'api'] }))

    // ---- OAuth: Google ----
    router.get('/google/redirect', [oauthController, 'googleRedirect'])
    router
      .get('/google/callback', [oauthController, 'googleCallback'])
      .use(middleware.rateLimit({ maxRequests: 10, windowSeconds: 60, keyPrefix: 'auth_callback' }))

    // ---- OAuth: Twitch (new unified controller) ----
    router.get('/twitch/redirect', [oauthController, 'twitchRedirect'])
    router
      .get('/twitch/callback', [oauthController, 'twitchCallback'])
      .use(middleware.rateLimit({ maxRequests: 10, windowSeconds: 60, keyPrefix: 'auth_callback' }))

    // ---- OAuth: Link/Unlink providers (authenticated) ----
    router
      .get('/link/google', [oauthController, 'linkGoogle'])
      .use(middleware.auth({ guards: ['web', 'api'] }))
    router
      .get('/link/google/callback', [oauthController, 'linkGoogleCallback'])
      .use(middleware.auth({ guards: ['web', 'api'] }))
    router
      .get('/link/twitch', [oauthController, 'linkTwitch'])
      .use(middleware.auth({ guards: ['web', 'api'] }))
    router
      .get('/link/twitch/callback', [oauthController, 'linkTwitchCallback'])
      .use(middleware.auth({ guards: ['web', 'api'] }))
    router
      .post('/unlink', [oauthController, 'unlinkProvider'])
      .use(middleware.auth({ guards: ['web', 'api'] }))

    // ---- Session management ----
    router
      .post('/logout', [sessionController, 'logout'])
      .use(middleware.auth({ guards: ['web', 'api'] }))
    router.get('/me', [sessionController, 'me']).use(middleware.auth({ guards: ['web', 'api'] }))
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

    // Campaign Events (unified events: polls, gamification, etc.)
    router.get('/campaigns/:id/events', '#controllers/mj/campaigns_controller.events')

    // GM Character Incarnation
    router.get('/campaigns/:id/characters', '#controllers/mj/gm_characters_controller.index')
    router.get('/campaigns/:id/active-character', '#controllers/mj/gm_characters_controller.show')
    router.post(
      '/campaigns/:id/active-character',
      '#controllers/mj/gm_characters_controller.update'
    )
    router.delete(
      '/campaigns/:id/active-character',
      '#controllers/mj/gm_characters_controller.destroy'
    )

    // Character type toggle (NPC <-> Monster)
    router.put(
      '/campaigns/:id/characters/:characterId/type',
      '#controllers/mj/gm_characters_controller.toggleType'
    )

    // GM Dice Roll Attribution
    router.get(
      '/campaigns/:id/pending-rolls',
      '#controllers/mj/gm_characters_controller.pendingRolls'
    )
    router.post(
      '/campaigns/:id/dice-rolls/:rollId/attribute',
      '#controllers/mj/gm_characters_controller.attributeRoll'
    )

    // Criticality Rules (custom dice criticality rules per campaign)
    router.get(
      '/campaigns/:campaignId/criticality-rules',
      '#controllers/mj/criticality_rules_controller.index'
    )
    router.post(
      '/campaigns/:campaignId/criticality-rules',
      '#controllers/mj/criticality_rules_controller.store'
    )
    router.put(
      '/campaigns/:campaignId/criticality-rules/:ruleId',
      '#controllers/mj/criticality_rules_controller.update'
    )
    router.delete(
      '/campaigns/:campaignId/criticality-rules/:ruleId',
      '#controllers/mj/criticality_rules_controller.destroy'
    )
    router.get(
      '/campaigns/:campaignId/system-info',
      '#controllers/mj/criticality_rules_controller.systemInfo'
    )

    // Item Introspection (aggregated item tree for visual explorer)
    router.get(
      '/campaigns/:campaignId/item-introspection',
      '#controllers/mj/item_introspection_controller.index'
    )

    // Item Category Rules (spell/feature/inventory categories per campaign)
    router.get(
      '/campaigns/:campaignId/item-category-rules',
      '#controllers/mj/item_category_rules_controller.index'
    )
    router.post(
      '/campaigns/:campaignId/item-category-rules',
      '#controllers/mj/item_category_rules_controller.store'
    )
    router.post(
      '/campaigns/:campaignId/item-category-rules/detect',
      '#controllers/mj/item_category_rules_controller.detect'
    )
    router.post(
      '/campaigns/:campaignId/item-category-rules/sync',
      '#controllers/mj/item_category_rules_controller.sync'
    )
    router.put(
      '/campaigns/:campaignId/item-category-rules/:ruleId',
      '#controllers/mj/item_category_rules_controller.update'
    )
    router.delete(
      '/campaigns/:campaignId/item-category-rules/:ruleId',
      '#controllers/mj/item_category_rules_controller.destroy'
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

    // ---- Gamification ----
    // Événements disponibles
    router.get('/gamification/events', '#controllers/mj/gamification_controller.listEvents')
    router.get('/gamification/events/:eventId', '#controllers/mj/gamification_controller.showEvent')

    // Configuration gamification par campagne
    router.get(
      '/campaigns/:id/gamification',
      '#controllers/mj/gamification_controller.getCampaignConfig'
    )
    router.post(
      '/campaigns/:id/gamification/events/:eventId/enable',
      '#controllers/mj/gamification_controller.enableEvent'
    )
    router.post(
      '/campaigns/:id/gamification/events/:eventId/disable',
      '#controllers/mj/gamification_controller.disableEvent'
    )
    router.put(
      '/campaigns/:id/gamification/events/:eventId',
      '#controllers/mj/gamification_controller.updateConfig'
    )

    // Instances de gamification
    router.get(
      '/campaigns/:id/gamification/instances',
      '#controllers/mj/gamification_controller.listInstances'
    )
    router.post(
      '/campaigns/:id/gamification/trigger',
      '#controllers/mj/gamification_controller.triggerEvent'
    )
    router.post(
      '/campaigns/:id/gamification/instances/:instanceId/cancel',
      '#controllers/mj/gamification_controller.cancelInstance'
    )

    // Force complete (DEV/STAGING only - for testing)
    router.post(
      '/campaigns/:id/gamification/instances/:instanceId/force-complete',
      '#controllers/mj/gamification_controller.forceComplete'
    )

    // Simulate redemption (DEV/STAGING only - self HTTP call to EventSub webhook)
    router.post(
      '/campaigns/:id/gamification/events/:eventId/simulate-redemption',
      '#controllers/mj/gamification_controller.simulateRedemption'
    )

    // Outils de maintenance MJ (production-safe)
    router.post(
      '/campaigns/:id/gamification/reset-cooldowns',
      '#controllers/mj/gamification_controller.resetCooldowns'
    )
    router.post(
      '/campaigns/:id/gamification/reset-state',
      '#controllers/mj/gamification_controller.resetState'
    )
    router.post(
      '/campaigns/:id/gamification/cleanup-foundry',
      '#controllers/mj/gamification_controller.cleanupFoundry'
    )

    // Statistiques gamification
    router.get(
      '/campaigns/:id/gamification/stats',
      '#controllers/mj/gamification_controller.getStats'
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
    router.post(
      '/vtt-connections/:id/reauthorize',
      '#controllers/mj/vtt_connections_controller.reauthorize'
    )

    // Streamers (recherche Twitch)
    router.get('/streamers', '#controllers/mj/streamers_controller.index')
    router.get('/streamers/search', '#controllers/mj/streamers_controller.search')
    // Alias pour compatibilité frontend
    router.get('/dashboards/search', '#controllers/mj/streamers_controller.search')
  })
  .prefix('/mj')
  .use(middleware.auth({ guards: ['web', 'api'] }))
  .use(middleware.validateUuid())

// ==========================================
// Routes VTT Publiques (sans authentification utilisateur)
// Ces routes utilisent leur propre validation JWT via refresh token
// ==========================================
router
  .post(
    '/mj/vtt-connections/refresh-token',
    '#controllers/mj/vtt_connections_controller.refreshToken'
  )
  .use(
    middleware.rateLimit({
      maxRequests: 30, // 30 refreshes per minute max (normal usage: ~1/hour)
      windowSeconds: 60,
      keyPrefix: 'vtt_refresh_token',
    })
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
// Routes Dashboard - Nouvelle destination (remplace /streamer/)
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

    // ---- Streamer Gamification ----
    // Liste des événements gamification disponibles pour une campagne (avec config streamer)
    router.get(
      '/campaigns/:campaignId/gamification',
      '#controllers/streamer/gamification_controller.list'
    )
    // Activer un événement (crée le reward Twitch)
    router
      .post(
        '/campaigns/:campaignId/gamification/events/:eventId/enable',
        '#controllers/streamer/gamification_controller.enable'
      )
      .use(
        middleware.rateLimit({
          maxRequests: 10,
          windowSeconds: 60,
          keyPrefix: 'gamification_enable',
        })
      )
    // Désactiver un événement (supprime le reward Twitch)
    router
      .post(
        '/campaigns/:campaignId/gamification/events/:eventId/disable',
        '#controllers/streamer/gamification_controller.disable'
      )
      .use(
        middleware.rateLimit({
          maxRequests: 10,
          windowSeconds: 60,
          keyPrefix: 'gamification_disable',
        })
      )
    // Mettre à jour le coût du reward
    router
      .put(
        '/campaigns/:campaignId/gamification/events/:eventId/cost',
        '#controllers/streamer/gamification_controller.updateCost'
      )
      .use(
        middleware.rateLimit({ maxRequests: 20, windowSeconds: 60, keyPrefix: 'gamification_cost' })
      )
  })
  .prefix('/dashboard')
  .use(middleware.auth({ guards: ['web', 'api'] }))
  .use(middleware.validateUuid())

// ==========================================
// Routes Overlay (publiques, sans authentification)
// ==========================================

// Route publique pour la config par défaut (sans paramètre UUID)
router.get(
  '/overlay/default-config',
  '#controllers/overlay-studio/overlay_studio_controller.getDefaultConfig'
)

// Route publique pour les propriétés par défaut d'un type d'élément
router.get(
  '/overlay-studio/defaults/:type',
  '#controllers/overlay-studio/overlay_studio_controller.getElementDefaults'
)

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
    // Gamification - Instance active (public)
    router.get(
      '/:streamerId/gamification/active',
      '#controllers/overlay/gamification_overlay_controller.getActive'
    )
    router.get(
      '/:streamerId/campaigns/:campaignId/gamification/active',
      '#controllers/overlay/gamification_overlay_controller.getActiveForCampaign'
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
// Routes Admin (réservées aux administrateurs)
// ==========================================
router
  .group(() => {
    router.get('/metrics', '#controllers/admin/metrics_controller.overview')
    router.get('/metrics/growth', '#controllers/admin/metrics_controller.growth')
    router.get('/metrics/subscriptions', '#controllers/admin/metrics_controller.subscriptions')

    // Pre-flight monitoring
    router.get('/preflight/reports', '#controllers/admin/preflight_controller.list')
    router.get('/preflight/reports/:id', '#controllers/admin/preflight_controller.show')
    router.get('/preflight/stats', '#controllers/admin/preflight_controller.stats')
  })
  .prefix('/admin')
  .use(middleware.auth({ guards: ['web', 'api'] }))
  .use(middleware.admin())

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

    // Gamification action executed callback (called by Foundry after executing action)
    router.post(
      '/gamification/:instanceId/executed',
      '#controllers/webhooks/vtt_controller.gamificationExecuted'
    )
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

    // Reauthorization status (module polls this after revocation)
    router.get(
      '/reauthorization-status',
      '#controllers/webhooks/foundry_webhook_controller.reauthorizationStatus'
    )
  })
  .prefix('/webhooks/foundry')
  .use(
    middleware.rateLimit({
      maxRequests: 30,
      windowSeconds: 60,
      keyPrefix: 'foundry_webhook',
    })
  )

// ==========================================
// Twitch EventSub Webhooks (public, auth via HMAC signature)
// ==========================================
router
  .group(() => {
    router.post('/eventsub', '#controllers/webhooks/twitch_eventsub_controller.handle')
  })
  .prefix('/webhooks/twitch')
// Pas de middleware auth - authentification via signature HMAC Twitch

// ==========================================
// Transmit WebSocket routes
// ==========================================
import transmit from '@adonisjs/transmit/services/main'
transmit.registerRoutes()
