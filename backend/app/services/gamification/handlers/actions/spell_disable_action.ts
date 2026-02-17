import logger from '@adonisjs/core/services/logger'
import type { ActionConfig } from '#models/gamification_event'
import type GamificationInstance from '#models/gamification_instance'
import type { ResultData } from '#models/gamification_instance'
import type { FoundryCommandService } from '../../action_executor.js'
import type { ActionHandler } from '../types.js'
import { resolveActorForStreamer, pickRandomSpell, getTargetableSpells } from './spell_utils.js'

/**
 * SpellDisableAction - Randomly disables a spell on the streamer's character
 *
 * The spell is greyed out / un-prepared in Foundry for a configurable duration.
 * After the duration, Foundry re-enables it automatically (via timer + flag recovery).
 *
 * Requires: vtt_connection
 */
export class SpellDisableAction implements ActionHandler {
  type = 'spell_disable'
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
          ? `All ${eligible.length} spell(s) have active effects — will bypass filter for disable selection`
          : `Excluding ${affectedCount} spell(s) with active effects from disable selection`
      )
    }

    const spell = pickRandomSpell(eligible, true, weights)
    if (!spell) {
      return { success: false, error: 'Aucun sort éligible trouvé' }
    }

    const spellConfig = config?.spellDisable
    const durationSeconds = spellConfig?.durationSeconds ?? 600
    const triggeredBy = instance.triggerData?.activation?.triggeredBy ?? 'le chat'

    logger.info(
      {
        event: 'spell_disable_execute',
        instanceId: instance.id,
        actorId,
        spellId: spell.id,
        spellName: spell.name,
        durationSeconds,
      },
      `Disabling spell "${spell.name}" for ${durationSeconds}s`
    )

    const result = await this.foundryCommandService.applySpellEffect(connectionId, {
      actorId,
      spellId: spell.id,
      spellName: spell.name,
      effect: {
        type: 'disable',
        durationSeconds,
        message: spellConfig?.disableMessage || 'Un sort a été bloqué par le chat !',
        triggeredBy,
      },
    })

    if (!result.success) {
      return { success: false, error: result.error || "Échec de l'application de l'effet" }
    }

    return {
      success: true,
      message: `Sort "${spell.name}" bloqué pendant ${Math.round(durationSeconds / 60)} min`,
      actionResult: {
        spellId: spell.id,
        spellName: spell.name,
        spellImg: spell.img,
        effectType: 'disable',
        durationSeconds,
        triggeredBy,
      },
    }
  }
}

export default SpellDisableAction
