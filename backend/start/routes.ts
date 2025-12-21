/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const AuthController = () => import('#controllers/auth_controller')
const MJController = () => import('#controllers/mj_controller')
const StreamerController = () => import('#controllers/streamer_controller')
const CampaignsController = () => import('#controllers/campaigns_controller')
const SupportController = () => import('#controllers/support_controller')

// Health check
router.get('/', async () => {
  return {
    app: 'Twitch Multi-Stream Poll',
    version: '1.0.0',
    status: 'running',
  }
})

// Dedicated health endpoint for Docker healthcheck and monitoring
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
    router.get('/twitch/redirect', [AuthController, 'redirect'])
    router.get('/twitch/callback', [AuthController, 'callback'])
    // Alias pour compat front: /auth/twitch/redirect/callback
    router.get('/auth/twitch/redirect', [AuthController, 'redirect'])
    router.get('/auth/twitch/callback', [AuthController, 'callback'])
    router.post('/logout', [AuthController, 'logout']).use(middleware.auth())
    router.get('/me', [AuthController, 'me']).use(middleware.auth())
    router.post('/switch-role', [AuthController, 'switchRole']).use(middleware.auth())
  })
  .prefix('/auth')

// ==========================================
// Routes MJ (Game Master)
// ==========================================
router
  .group(() => {
    // Gestion des streamers
    router.get('/streamers', [MJController, 'listStreamers'])

    // Gestion des campagnes
    router.get('/campaigns', [CampaignsController, 'listCampaigns'])
    router.post('/campaigns', [CampaignsController, 'createCampaign'])
    router.get('/campaigns/:id', [CampaignsController, 'getCampaign'])
    router.put('/campaigns/:id', [CampaignsController, 'updateCampaign'])
    router.delete('/campaigns/:id', [CampaignsController, 'deleteCampaign'])

    // Gestion des membres de campagne
    router.post('/campaigns/:id/invite', [CampaignsController, 'inviteStreamer'])
    router.delete('/campaigns/:id/members/:memberId', [CampaignsController, 'removeMember'])
    router.post('/campaigns/:id/members/:memberId/activate', [
      CampaignsController,
      'activateMember',
    ])

    // Recherche Twitch
    router.get('/twitch/search-streamers', [CampaignsController, 'searchStreamers'])

    // Sessions de sondages scoped par campagne
    router.get('/campaigns/:campaignId/poll-sessions', [MJController, 'listPollSessions'])
    router.post('/campaigns/:campaignId/poll-sessions', [MJController, 'createPollSession'])
    router.get('/campaigns/:campaignId/poll-sessions/:id', [MJController, 'getPollSession'])
    router.put('/campaigns/:campaignId/poll-sessions/:id', [MJController, 'updatePollSession'])
    router.delete('/campaigns/:campaignId/poll-sessions/:id', [MJController, 'deletePollSession'])

    // Gestion des sondages dans une session
    router.post('/campaigns/:campaignId/poll-sessions/:sessionId/polls', [
      MJController,
      'addPollToSession',
    ])
    router.put('/campaigns/:campaignId/poll-sessions/:sessionId/polls/:pollId', [
      MJController,
      'updatePollInSession',
    ])
    router.delete('/campaigns/:campaignId/poll-sessions/:sessionId/polls/:pollId', [
      MJController,
      'deletePollFromSession',
    ])

    // Lancement et résultats des sondages
    router.post('/campaigns/:campaignId/polls/:pollId/launch', [
      MJController,
      'launchPollFromSession',
    ])
    router.patch('/campaigns/:campaignId/polls/:pollId/cancel', [
      MJController,
      'cancelPollFromSession',
    ])
    router.get('/campaigns/:campaignId/polls/:pollId/results', [MJController, 'getPollResults'])

    // Templates scoped par campagne (legacy)
    router.get('/campaigns/:campaignId/templates', [MJController, 'listTemplates'])
    router.post('/campaigns/:campaignId/templates', [MJController, 'createTemplate'])
    router.put('/campaigns/:campaignId/templates/:id', [MJController, 'updateTemplate'])
    router.delete('/campaigns/:campaignId/templates/:id', [MJController, 'deleteTemplate'])

    // Polls scoped par campagne (legacy)
    router.post('/campaigns/:campaignId/polls/launch', [MJController, 'launchPoll'])
    router.get('/campaigns/:campaignId/polls', [MJController, 'listPolls'])
    router.get('/campaigns/:campaignId/polls/:id', [MJController, 'getPoll'])

    // Gestion des templates de sondages (legacy - sans campagne)
    router.get('/poll-templates', [MJController, 'listTemplates'])
    router.post('/poll-templates', [MJController, 'createTemplate'])
    router.put('/poll-templates/:id', [MJController, 'updateTemplate'])
    router.delete('/poll-templates/:id', [MJController, 'deleteTemplate'])

    // Gestion des sondages (legacy - sans campagne)
    router.post('/polls/launch', [MJController, 'launchPoll'])
    router.get('/polls', [MJController, 'listPolls'])
    router.get('/polls/:id', [MJController, 'getPoll'])
  })
  .prefix('/mj')
  .use(middleware.auth())

// ==========================================
// Support / Tickets Discord
// ==========================================
router
  .group(() => {
    router.post('/report', [SupportController, 'report'])
  })
  .prefix('/support')
  .use(middleware.auth())

// ==========================================
// Routes Streamer
// ==========================================
router
  .group(() => {
    // Invitations et campagnes
    router.get('/campaigns/invitations', [CampaignsController, 'listInvitations'])
    router.post('/campaigns/invitations/:id/accept', [CampaignsController, 'acceptInvitation'])
    router.post('/campaigns/invitations/:id/decline', [CampaignsController, 'declineInvitation'])

    // Campagnes actives
    router.get('/campaigns', [CampaignsController, 'listActiveCampaigns'])
    router.post('/campaigns/:id/leave', [CampaignsController, 'leaveCampaign'])

    // Routes existantes
    router.get('/overlay-url', [StreamerController, 'getOverlayUrl'])
    router.post('/revoke', [StreamerController, 'revokeAccess'])
  })
  .prefix('/streamer')
  .use(middleware.auth())
