import type { ActionConfig } from '#models/gamification_event'
import type GamificationInstance from '#models/gamification_instance'
import type { ResultData } from '#models/gamification_instance'
import type { FoundryCommandService } from '../../action_executor.js'
import type { ActionHandler } from '../types.js'

/**
 * StatModifyAction - Modifies actor stats in Foundry VTT
 *
 * Requires: vtt_connection
 */
export class StatModifyAction implements ActionHandler {
  type = 'stat_modify'
  requires = ['vtt_connection']

  private foundryCommandService: FoundryCommandService | null = null

  setFoundryCommandService(service: FoundryCommandService): void {
    this.foundryCommandService = service
  }

  async execute(
    config: ActionConfig | null,
    _instance: GamificationInstance,
    connectionId: string
  ): Promise<ResultData> {
    if (!this.foundryCommandService) {
      return { success: false, error: 'Service Foundry non disponible' }
    }

    const statConfig = config?.statModify
    if (!statConfig?.actorId || !statConfig?.updates) {
      return { success: false, error: 'Configuration de modification de stats incomplète' }
    }

    const result = await this.foundryCommandService.modifyActor(
      connectionId,
      statConfig.actorId,
      statConfig.updates
    )

    return {
      success: result.success,
      message: result.success ? 'Stats modifiées' : undefined,
      error: result.error,
      actionResult: {
        actorId: statConfig.actorId,
        updates: statConfig.updates,
      },
    }
  }
}

export default StatModifyAction
