import type { HttpContext } from '@adonisjs/core/http'
import Character from '#models/character'
import CharacterAssignment from '#models/character_assignment'
import { streamer as Streamer } from '#models/streamer'
import { campaign as Campaign } from '#models/campaign'

export default class CharactersController {
  /**
   * Récupère les personnages disponibles pour une campagne
   * GET /streamer/campaigns/:campaignId/characters
   */
  async index({ auth, params, response }: HttpContext) {
    const user = auth.user!

    // Vérifier que le streamer est membre de cette campagne
    const streamer = await Streamer.query().where('user_id', user.id).firstOrFail()

    const campaign = await Campaign.query()
      .where('id', params.campaignId)
      .whereHas('memberships', (query) => {
        query.where('streamer_id', streamer.id).where('status', 'ACTIVE')
      })
      .firstOrFail()

    // Récupérer tous les personnages de la campagne
    const characters = await Character.query()
      .where('campaign_id', campaign.id)
      .where('character_type', 'pc')
      .orderBy('name', 'asc')

    // Récupérer l'assignment actuel du streamer pour cette campagne
    const currentAssignment = await CharacterAssignment.query()
      .where('streamer_id', streamer.id)
      .where('campaign_id', campaign.id)
      .preload('character')
      .first()

    return response.ok({
      characters,
      currentAssignment,
    })
  }

  /**
   * Assigne un personnage au streamer pour une campagne
   * POST /streamer/campaigns/:campaignId/characters/:characterId/assign
   */
  async assign({ auth, params, response }: HttpContext) {
    const user = auth.user!

    // Vérifier que le streamer est membre de cette campagne
    const streamer = await Streamer.query().where('user_id', user.id).firstOrFail()

    const campaign = await Campaign.query()
      .where('id', params.campaignId)
      .whereHas('memberships', (query) => {
        query.where('streamer_id', streamer.id).where('status', 'ACTIVE')
      })
      .firstOrFail()

    // Vérifier que le personnage existe et appartient à cette campagne
    const character = await Character.query()
      .where('id', params.characterId)
      .where('campaign_id', campaign.id)
      .where('character_type', 'pc')
      .firstOrFail()

    // Vérifier que le personnage n'est pas déjà assigné à un autre streamer
    const existingAssignment = await CharacterAssignment.query()
      .where('character_id', character.id)
      .where('campaign_id', campaign.id)
      .first()

    if (existingAssignment && existingAssignment.streamerId !== streamer.id) {
      return response.badRequest({
        error: 'Character already assigned to another streamer',
      })
    }

    // Supprimer l'ancien assignment du streamer pour cette campagne (si existe)
    await CharacterAssignment.query()
      .where('streamer_id', streamer.id)
      .where('campaign_id', campaign.id)
      .delete()

    // Créer le nouvel assignment
    const assignment = await CharacterAssignment.create({
      characterId: character.id,
      streamerId: streamer.id,
      campaignId: campaign.id,
    })

    await assignment.load('character')

    return response.ok(assignment)
  }

  /**
   * Retire l'assignment de personnage du streamer pour une campagne
   * DELETE /streamer/campaigns/:campaignId/characters/unassign
   */
  async unassign({ auth, params, response }: HttpContext) {
    const user = auth.user!

    // Vérifier que le streamer est membre de cette campagne
    const streamer = await Streamer.query().where('user_id', user.id).firstOrFail()

    await Campaign.query()
      .where('id', params.campaignId)
      .whereHas('memberships', (query) => {
        query.where('streamer_id', streamer.id).where('status', 'ACTIVE')
      })
      .firstOrFail()

    // Supprimer l'assignment du streamer pour cette campagne
    await CharacterAssignment.query()
      .where('streamer_id', streamer.id)
      .where('campaign_id', params.campaignId)
      .delete()

    return response.noContent()
  }
}
