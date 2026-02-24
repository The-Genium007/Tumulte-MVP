import logger from '@adonisjs/core/services/logger'
import type { ActionConfig } from '#models/gamification_event'
import type GamificationInstance from '#models/gamification_instance'
import type { ResultData } from '#models/gamification_instance'
import type { FoundryCommandService } from '../../action_executor.js'
import type { ActionHandler } from '../types.js'
import { getActiveCombatData, getHostileMonsters, pickRandomMonster } from './monster_utils.js'

/**
 * MonsterBuffAction - Randomly buffs a hostile monster in active combat
 *
 * Applies AC bonus and temporary HP to a random hostile monster.
 * Visual: green halo on the token in Foundry.
 *
 * Requires: vtt_connection
 */
export class MonsterBuffAction implements ActionHandler {
  type = 'monster_buff'
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
    const monsterConfig = config?.monsterBuff
    const acBonus = monsterConfig?.acBonus ?? 2
    const tempHp = monsterConfig?.tempHp ?? 10
    const highlightColor = monsterConfig?.highlightColor ?? '#10B981'
    const triggeredBy = instance.triggerData?.activation?.triggeredBy ?? 'le chat'

    logger.info(
      {
        event: 'monster_buff_execute',
        instanceId: instance.id,
        actorId: monster.actorId,
        monsterName: monster.name,
        acBonus,
        tempHp,
      },
      `Buffing monster "${monster.name}" with +${acBonus} AC and ${tempHp} temp HP`
    )

    // 5. Send command to Foundry
    const result = await this.foundryCommandService.applyMonsterEffect(connectionId, {
      actorId: monster.actorId,
      monsterName: monster.name,
      monsterImg: monster.img ?? undefined,
      effect: {
        type: 'buff',
        acBonus,
        tempHp,
        highlightColor,
        message: monsterConfig?.buffMessage || 'Un monstre a été renforcé par le chat !',
        triggeredBy,
      },
    })

    if (!result.success) {
      return { success: false, error: result.error || "Échec de l'application de l'effet" }
    }

    return {
      success: true,
      message: `Monstre "${monster.name}" renforcé (+${acBonus} CA, +${tempHp} PV temp)`,
      actionResult: {
        monsterName: monster.name,
        monsterImg: monster.img,
        effectType: 'buff',
        acBonus,
        tempHp,
        highlightColor,
        triggeredBy,
      },
    }
  }
}

export default MonsterBuffAction
