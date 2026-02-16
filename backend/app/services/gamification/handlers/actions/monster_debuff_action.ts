import logger from '@adonisjs/core/services/logger'
import type { ActionConfig } from '#models/gamification_event'
import type GamificationInstance from '#models/gamification_instance'
import type { ResultData } from '#models/gamification_instance'
import type { FoundryCommandService } from '../../action_executor.js'
import type { ActionHandler } from '../types.js'
import { getActiveCombatData, getHostileMonsters, pickRandomMonster } from './monster_utils.js'

/**
 * MonsterDebuffAction - Randomly debuffs a hostile monster in active combat
 *
 * Applies AC penalty and max HP reduction to a random hostile monster.
 * Visual: red halo on the token in Foundry.
 *
 * Requires: vtt_connection
 */
export class MonsterDebuffAction implements ActionHandler {
  type = 'monster_debuff'
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

    // 1. Check for active combat
    const combatData = await getActiveCombatData(instance.campaignId)
    if (!combatData) {
      return { success: false, error: 'Aucun combat actif détecté' }
    }

    // 2. Get hostile, non-defeated monsters
    const monsters = getHostileMonsters(combatData.combatants)
    if (monsters.length === 0) {
      return { success: false, error: 'Aucun monstre hostile trouvé dans le combat' }
    }

    // 3. Pick a random monster
    const monster = pickRandomMonster(monsters)
    if (!monster) {
      return { success: false, error: 'Impossible de sélectionner un monstre' }
    }

    // 4. Read config
    const monsterConfig = config?.monsterDebuff
    const acPenalty = monsterConfig?.acPenalty ?? 2
    const maxHpReduction = monsterConfig?.maxHpReduction ?? 10
    const highlightColor = monsterConfig?.highlightColor ?? '#EF4444'
    const triggeredBy = instance.triggerData?.activation?.triggeredBy ?? 'le chat'

    logger.info(
      {
        event: 'monster_debuff_execute',
        instanceId: instance.id,
        actorId: monster.actorId,
        monsterName: monster.name,
        acPenalty,
        maxHpReduction,
      },
      `Debuffing monster "${monster.name}" with -${acPenalty} AC and -${maxHpReduction} max HP`
    )

    // 5. Send command to Foundry
    const result = await this.foundryCommandService.applyMonsterEffect(connectionId, {
      actorId: monster.actorId,
      monsterName: monster.name,
      monsterImg: monster.img ?? undefined,
      effect: {
        type: 'debuff',
        acPenalty,
        maxHpReduction,
        highlightColor,
        message: monsterConfig?.debuffMessage || 'Un monstre a été affaibli par le chat !',
        triggeredBy,
      },
    })

    if (!result.success) {
      return { success: false, error: result.error || "Échec de l'application de l'effet" }
    }

    return {
      success: true,
      message: `Monstre "${monster.name}" affaibli (-${acPenalty} CA, -${maxHpReduction} PV max)`,
      actionResult: {
        monsterName: monster.name,
        monsterImg: monster.img,
        effectType: 'debuff',
        acPenalty,
        maxHpReduction,
        highlightColor,
        triggeredBy,
      },
    }
  }
}

export default MonsterDebuffAction
