import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { campaign as Campaign } from '#models/campaign'
import Character from '#models/character'
import CharacterAssignment from '#models/character_assignment'
import DiceRoll from '#models/dice_roll'

/**
 * Controller for GM character incarnation management
 *
 * Allows the Game Master to:
 * - List all characters in a campaign (PCs and NPCs)
 * - Set/unset the currently active character they are incarnating
 * - Get the current active character
 */
@inject()
export default class GmCharactersController {
  /**
   * List all characters available for the GM to incarnate
   * GET /mj/campaigns/:id/characters
   *
   * Returns all characters (PCs and NPCs) in the campaign
   */
  async index({ auth, params, response }: HttpContext) {
    const userId = auth.user!.id

    // Verify campaign ownership
    const campaign = await Campaign.query().where('id', params.id).where('owner_id', userId).first()

    if (!campaign) {
      return response.notFound({ error: 'Campaign not found or not owned by user' })
    }

    // Get all characters in the campaign
    const characters = await Character.query()
      .where('campaign_id', params.id)
      .orderBy('character_type', 'asc') // PCs first, then NPCs
      .orderBy('name', 'asc')

    // Get all character assignments for this campaign to know which PCs are claimed
    const assignments = await CharacterAssignment.query()
      .where('campaign_id', params.id)
      .preload('streamer', (query) => {
        query.preload('user')
      })

    // Create a map of characterId -> streamer info
    const assignmentMap = new Map(
      assignments.map((a) => [
        a.characterId,
        {
          streamerId: a.streamerId,
          streamerName: a.streamer?.twitchDisplayName || 'Joueur',
        },
      ])
    )

    return response.ok({
      data: characters.map((char) => {
        const assignment = assignmentMap.get(char.id)
        return {
          id: char.id,
          name: char.name,
          avatarUrl: char.avatarUrl,
          characterType: char.characterType,
          vttCharacterId: char.vttCharacterId,
          stats: char.stats,
          lastSyncAt: char.lastSyncAt?.toISO(),
          // New fields for assignment info
          assignedToStreamer: assignment
            ? {
                streamerId: assignment.streamerId,
                streamerName: assignment.streamerName,
              }
            : null,
        }
      }),
    })
  }

  /**
   * Get the currently active character for the GM
   * GET /mj/campaigns/:id/active-character
   */
  async show({ auth, params, response }: HttpContext) {
    const userId = auth.user!.id

    // Verify campaign ownership and load active character
    const campaign = await Campaign.query()
      .where('id', params.id)
      .where('owner_id', userId)
      .preload('gmActiveCharacter')
      .first()

    if (!campaign) {
      return response.notFound({ error: 'Campaign not found or not owned by user' })
    }

    if (!campaign.gmActiveCharacter) {
      return response.ok({
        data: null,
      })
    }

    return response.ok({
      data: {
        id: campaign.gmActiveCharacter.id,
        name: campaign.gmActiveCharacter.name,
        avatarUrl: campaign.gmActiveCharacter.avatarUrl,
        characterType: campaign.gmActiveCharacter.characterType,
      },
    })
  }

  /**
   * Set the active character for the GM
   * POST /mj/campaigns/:id/active-character
   *
   * Body: { characterId: string | null }
   * - Pass a characterId to set the active character
   * - Pass null to clear the active character
   */
  async update({ auth, params, request, response }: HttpContext) {
    const userId = auth.user!.id
    const { characterId } = request.only(['characterId'])

    // Verify campaign ownership
    const campaign = await Campaign.query().where('id', params.id).where('owner_id', userId).first()

    if (!campaign) {
      return response.notFound({ error: 'Campaign not found or not owned by user' })
    }

    // If characterId is provided, verify it belongs to this campaign
    if (characterId) {
      const character = await Character.query()
        .where('id', characterId)
        .where('campaign_id', params.id)
        .first()

      if (!character) {
        return response.notFound({ error: 'Character not found in this campaign' })
      }

      campaign.gmActiveCharacterId = characterId
    } else {
      // Clear active character
      campaign.gmActiveCharacterId = null
    }

    await campaign.save()

    // Reload with character data
    await campaign.load('gmActiveCharacter')

    return response.ok({
      data: campaign.gmActiveCharacter
        ? {
            id: campaign.gmActiveCharacter.id,
            name: campaign.gmActiveCharacter.name,
            avatarUrl: campaign.gmActiveCharacter.avatarUrl,
            characterType: campaign.gmActiveCharacter.characterType,
          }
        : null,
    })
  }

  /**
   * Clear the active character for the GM
   * DELETE /mj/campaigns/:id/active-character
   */
  async destroy({ auth, params, response }: HttpContext) {
    const userId = auth.user!.id

    // Verify campaign ownership
    const campaign = await Campaign.query().where('id', params.id).where('owner_id', userId).first()

    if (!campaign) {
      return response.notFound({ error: 'Campaign not found or not owned by user' })
    }

    campaign.gmActiveCharacterId = null
    await campaign.save()

    return response.noContent()
  }

  /**
   * Get pending dice rolls awaiting attribution
   * GET /mj/campaigns/:id/pending-rolls
   */
  async pendingRolls({ auth, params, response }: HttpContext) {
    const userId = auth.user!.id

    // Verify campaign ownership
    const campaign = await Campaign.query().where('id', params.id).where('owner_id', userId).first()

    if (!campaign) {
      return response.notFound({ error: 'Campaign not found or not owned by user' })
    }

    // Get all pending rolls for this campaign
    const pendingRolls = await DiceRoll.query()
      .where('campaign_id', params.id)
      .where('pending_attribution', true)
      .orderBy('rolled_at', 'asc')

    return response.ok({
      data: pendingRolls.map((roll) => ({
        id: roll.id,
        rollFormula: roll.rollFormula,
        result: roll.result,
        diceResults: roll.diceResults,
        isCritical: roll.isCritical,
        criticalType: roll.criticalType,
        rollType: roll.rollType,
        skill: roll.skill,
        ability: roll.ability,
        rolledAt: roll.rolledAt.toISO(),
      })),
    })
  }

  /**
   * Attribute a pending dice roll to a character
   * POST /mj/campaigns/:id/dice-rolls/:rollId/attribute
   *
   * Body: { characterId: string | null }
   * - Pass a characterId to attribute to that character
   * - Pass null to ignore the roll (mark as attributed without character)
   */
  async attributeRoll({ auth, params, request, response }: HttpContext) {
    const userId = auth.user!.id
    const { characterId } = request.only(['characterId'])

    // Verify campaign ownership
    const campaign = await Campaign.query().where('id', params.id).where('owner_id', userId).first()

    if (!campaign) {
      return response.notFound({ error: 'Campaign not found or not owned by user' })
    }

    // Find the pending roll
    const diceRoll = await DiceRoll.query()
      .where('id', params.rollId)
      .where('campaign_id', params.id)
      .where('pending_attribution', true)
      .first()

    if (!diceRoll) {
      return response.notFound({ error: 'Pending roll not found' })
    }

    // If characterId is provided, verify it belongs to this campaign
    if (characterId) {
      const character = await Character.query()
        .where('id', characterId)
        .where('campaign_id', params.id)
        .first()

      if (!character) {
        return response.notFound({ error: 'Character not found in this campaign' })
      }

      diceRoll.characterId = characterId
    }
    // If characterId is null, the roll is "ignored" (no character attribution)

    // Mark as no longer pending
    diceRoll.pendingAttribution = false
    await diceRoll.save()

    // If attributed to a character, emit WebSocket events
    if (characterId) {
      await diceRoll.load('character')
      await diceRoll.load('campaign')
      await this.emitAttributedRollEvents(diceRoll)
    }

    return response.ok({
      data: {
        id: diceRoll.id,
        characterId: diceRoll.characterId,
        pendingAttribution: diceRoll.pendingAttribution,
      },
    })
  }

  /**
   * Emit WebSocket events for an attributed roll
   */
  private async emitAttributedRollEvents(diceRoll: DiceRoll): Promise<void> {
    const transmitModule = await import('@adonisjs/transmit/services/main')
    const transmit = transmitModule.default

    const character = diceRoll.character
    const campaign = diceRoll.campaign

    if (!character || !campaign) return

    // Emit to campaign channel
    transmit.broadcast(`campaign/${campaign.id}/dice-rolls`, {
      event: 'dice-roll:attributed',
      data: {
        id: diceRoll.id,
        characterId: character.id,
        characterName: character.name,
        characterAvatar: character.avatarUrl,
        rollFormula: diceRoll.rollFormula,
        result: diceRoll.result,
        diceResults: diceRoll.diceResults,
        isCritical: diceRoll.isCritical,
        criticalType: diceRoll.criticalType,
        rollType: diceRoll.rollType,
        skill: diceRoll.skill,
        ability: diceRoll.ability,
        rolledAt: diceRoll.rolledAt.toISO(),
      },
    })
  }
}
