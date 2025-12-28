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
    router.get('/twitch/callback', [authController, 'callback'])
    router.post('/logout', [authController, 'logout']).use(middleware.auth())
    router.get('/me', [authController, 'me']).use(middleware.auth())
    router.post('/switch-role', [authController, 'switchRole']).use(middleware.auth())
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
    router.post('/campaigns/:id/invite', '#controllers/mj/campaigns_controller.invite')
    router.get('/campaigns/:id/members', '#controllers/mj/campaigns_controller.listMembers')
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

    // Polls (lancement et contrôle)
    router.post('/campaigns/:campaignId/polls/launch', '#controllers/mj/polls_controller.launch')
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
  .use(middleware.auth())
  .use(middleware.role({ role: 'MJ' }))

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
  })
  .prefix('/streamer')
  .use(middleware.auth())
  .use(middleware.role({ role: 'STREAMER' }))

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
  })
  .prefix('/overlay')
// Pas de middleware auth - routes publiques pour OBS

// ==========================================
// Routes Account (accessible à tous les rôles authentifiés)
// ==========================================
router
  .group(() => {
    router.delete('/delete', '#controllers/account_controller.deleteAccount')
  })
  .prefix('/account')
  .use(middleware.auth())

// ==========================================
// Routes Support (accessible à tous les rôles authentifiés)
// ==========================================
router
  .group(() => {
    router.post('/report', [supportController, 'report'])
  })
  .prefix('/support')
  .use(middleware.auth())

// ==========================================
// Transmit WebSocket routes
// ==========================================
import transmit from '@adonisjs/transmit/services/main'
transmit.registerRoutes()
