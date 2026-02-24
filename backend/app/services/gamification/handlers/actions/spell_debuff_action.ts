import logger from '@adonisjs/core/services/logger'
import type { ActionConfig } from '#models/gamification_event'
import type GamificationInstance from '#models/gamification_instance'
import type { ResultData } from '#models/gamification_instance'
import type { FoundryCommandService } from '../../action_executor.js'
import type { ActionHandler } from '../types.js'
import { resolveActorForStreamer, pickRandomSpell, getTargetableSpells } from './spell_utils.js'

/**
 * SpellDebuffAction - Randomly debuffs a spell on the streamer's character
 *
 * The spell is highlighted in Foundry. Next use gets disadvantage or a numeric penalty.
 * Single-use: consumed when the spell is cast.
 *
 * Requires: vtt_connection
 */
export class SpellDebuffAction implements ActionHandler {
  type = 'spell_debuff'
  requires = ['vtt_connection']

  private foundryCommandService: FoundryCommandService | null = null

  setFoundryCommandService(service: FoundryCommandService): void {
    this.foundryCommandService = service
  }

  async execute(
    config: ActionConfig | null,
    instance: GamificationInstance,
    connectionId: string
  ): Promise<ResultData> {
    if (!this.foundryCommandService) {
      return { success: false, error: 'Service Foundry non disponible' }
    }

    if (!instance.streamerId) {
      return { success: false, error: 'Pas de streamer associé à cette instance' }
    }

    const resolved = await resolveActorForStreamer(instance.campaignId, instance.streamerId)
    if (!resolved) {
      return { success: false, error: 'Aucun personnage assigné au streamer' }
    }

    const { actorId, character } = resolved
    const spells = character.spells
    if (!spells || spells.length === 0) {
      return { success: false, error: "Le personnage n'a aucun sort synchronisé" }
    }

    // Filter spells using campaign category rules (weighted selection)
    const { eligible, weights } = await getTargetableSpells(instance.campaignId, spells)

    const affectedCount = eligible.filter((s) => s.activeEffect).length
    if (affectedCount > 0) {
      const allAffected = affectedCount >= eligible.length
      logger.info(
        {
          event: 'spell_selection_filtered',
          affectedCount,
          totalEligible: eligible.length,
          allAffected,
        },
        allAffected
          ? `All ${eligible.length} spell(s) have active effects — will bypass filter for debuff selection`
          : `Excluding ${affectedCount} spell(s) with active effects from debuff selection`
      )
    }

    const spell = pickRandomSpell(eligible, false, weights)
    if (!spell) {
      return { success: false, error: 'Aucun sort éligible trouvé' }
    }

    const spellConfig = config?.spellDebuff
    const debuffType = spellConfig?.debuffType ?? 'disadvantage'
    const penaltyValue = spellConfig?.penaltyValue ?? 2
    const highlightColor = spellConfig?.highlightColor ?? '#EF4444'
    const triggeredBy = instance.triggerData?.activation?.triggeredBy ?? 'le chat'

    logger.info(
      {
        event: 'spell_debuff_execute',
        instanceId: instance.id,
        actorId,
        spellId: spell.id,
        spellName: spell.name,
        debuffType,
        penaltyValue,
      },
      `Debuffing spell "${spell.name}" with ${debuffType}`
    )

    const result = await this.foundryCommandService.applySpellEffect(connectionId, {
      actorId,
      spellId: spell.id,
      spellName: spell.name,
      effect: {
        type: 'debuff',
        debuffType,
        penaltyValue,
        highlightColor,
        message: spellConfig?.debuffMessage || 'Un sort a été maudit par le chat !',
        triggeredBy,
      },
    })

    if (!result.success) {
      return { success: false, error: result.error || "Échec de l'application de l'effet" }
    }

    return {
      success: true,
      message: `Sort "${spell.name}" maudit (${debuffType === 'disadvantage' ? 'désavantage' : `-${penaltyValue}`})`,
      actionResult: {
        spellId: spell.id,
        spellName: spell.name,
        spellImg: spell.img,
        effectType: 'debuff',
        debuffType,
        penaltyValue,
        highlightColor,
        triggeredBy,
      },
    }
  }
}

export default SpellDebuffAction
