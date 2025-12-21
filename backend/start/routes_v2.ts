/*
|--------------------------------------------------------------------------
| Routes V2
|--------------------------------------------------------------------------
|
| Routes pour la version 2 de l'API avec architecture modulaire
| Préfixe: /api/v2
|
*/

import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

/*
|--------------------------------------------------------------------------
| Routes MJ (Maître du Jeu)
|--------------------------------------------------------------------------
*/

router
  .group(() => {
    // Campaigns
    router
      .group(() => {
        router.get('/', '#controllers/mj/campaigns_controller.index')
        router.post('/', '#controllers/mj/campaigns_controller.store')
        router.get('/:id', '#controllers/mj/campaigns_controller.show')
        router.put('/:id', '#controllers/mj/campaigns_controller.update')
        router.delete('/:id', '#controllers/mj/campaigns_controller.destroy')
        router.post('/:id/invite', '#controllers/mj/campaigns_controller.invite')
        router.get('/:id/members', '#controllers/mj/campaigns_controller.listMembers')
        router.delete('/:id/members/:memberId', '#controllers/mj/campaigns_controller.removeMember')

        // Poll Sessions sous campaigns
        router.get('/:campaignId/sessions', '#controllers/mj/poll_sessions_controller.index')
        router.post('/:campaignId/sessions', '#controllers/mj/poll_sessions_controller.store')

        // Poll Templates sous campaigns
        router.get(
          '/:campaignId/templates',
          '#controllers/mj/poll_templates_controller.indexByCampaign'
        )
        router.post('/:campaignId/templates', '#controllers/mj/poll_templates_controller.store')

        // Polls sous campaigns
        router.get('/:campaignId/polls', '#controllers/mj/polls_controller.index')
        router.post('/:campaignId/polls/launch', '#controllers/mj/polls_controller.launch')
      })
      .prefix('/campaigns')

    // Poll Sessions (routes directes)
    router
      .group(() => {
        router.get('/:id', '#controllers/mj/poll_sessions_controller.show')
        router.put('/:id', '#controllers/mj/poll_sessions_controller.update')
        router.delete('/:id', '#controllers/mj/poll_sessions_controller.destroy')
        router.post('/:id/polls', '#controllers/mj/poll_sessions_controller.addPoll')
        router.put('/:id/polls/:pollId', '#controllers/mj/poll_sessions_controller.updatePoll')
        router.delete('/:id/polls/:pollId', '#controllers/mj/poll_sessions_controller.deletePoll')
        router.put('/:id/polls/reorder', '#controllers/mj/poll_sessions_controller.reorderPolls')
      })
      .prefix('/sessions')

    // Poll Templates (routes directes)
    router
      .group(() => {
        router.get('/', '#controllers/mj/poll_templates_controller.index')
        router.get('/:id', '#controllers/mj/poll_templates_controller.show')
        router.put('/:id', '#controllers/mj/poll_templates_controller.update')
        router.delete('/:id', '#controllers/mj/poll_templates_controller.destroy')
      })
      .prefix('/templates')

    // Polls (contrôle et résultats)
    router
      .group(() => {
        router.get('/:id', '#controllers/mj/polls_controller.show')
        router.post('/:id/cancel', '#controllers/mj/polls_controller.cancel')
        router.get('/:id/results', '#controllers/mj/polls_controller.results')
        router.get('/:id/live', '#controllers/mj/polls_controller.live')
      })
      .prefix('/polls')

    // Streamers (recherche)
    router
      .group(() => {
        router.get('/', '#controllers/mj/streamers_controller.index')
        router.get('/search', '#controllers/mj/streamers_controller.search')
        router.get('/:id', '#controllers/mj/streamers_controller.show')
      })
      .prefix('/streamers')
  })
  .prefix('/api/v2/mj')
  .use(middleware.auth())
  .use(middleware.role({ role: 'MJ' }))

/*
|--------------------------------------------------------------------------
| Routes Streamer
|--------------------------------------------------------------------------
*/

router
  .group(() => {
    // Invitations
    router.get('/invitations', '#controllers/streamer/campaigns_controller.invitations')
    router.post(
      '/invitations/:id/accept',
      '#controllers/streamer/campaigns_controller.acceptInvitation'
    )
    router.post(
      '/invitations/:id/decline',
      '#controllers/streamer/campaigns_controller.declineInvitation'
    )

    // Authorization status (global) - MUST be before /campaigns/:id routes
    router.get(
      '/campaigns/authorization-status',
      '#controllers/streamer/authorization_controller.status'
    )

    // Campaigns
    router
      .group(() => {
        router.get('/', '#controllers/streamer/campaigns_controller.index')
        router.post('/:id/leave', '#controllers/streamer/campaigns_controller.leave')

        // Authorization
        router.post(
          '/:campaignId/authorize',
          '#controllers/streamer/authorization_controller.grant'
        )
        router.delete(
          '/:campaignId/authorize',
          '#controllers/streamer/authorization_controller.revoke'
        )
      })
      .prefix('/campaigns')
  })
  .prefix('/api/v2/streamer')
  .use(middleware.auth())
  .use(middleware.role({ role: 'STREAMER' }))

/*
|--------------------------------------------------------------------------
| Routes Account (communes à tous les rôles)
|--------------------------------------------------------------------------
*/

router
  .group(() => {
    router.delete('/delete', '#controllers/account_controller.deleteAccount')
  })
  .prefix('/api/v2/account')
  .use(middleware.auth())

/*
|--------------------------------------------------------------------------
| Routes Overlay (publiques)
|--------------------------------------------------------------------------
*/

router
  .group(() => {
    router.get('/streamer/:streamerId', '#controllers/streamer/overlay_controller.streamerInfo')
    router.get(
      '/streamer/:streamerId/active-poll',
      '#controllers/streamer/overlay_controller.activePoll'
    )
    router.get(
      '/streamer/:streamerId/poll/:pollInstanceId',
      '#controllers/streamer/overlay_controller.pollResults'
    )
  })
  .prefix('/api/v2/overlay')
// Pas de middleware auth pour les overlays OBS
