import logger from '@adonisjs/core/services/logger'
import type { ActionConfig } from '#models/gamification_event'
import type GamificationInstance from '#models/gamification_instance'
import type { ResultData } from '#models/gamification_instance'
import type { ActionHandler } from '../types.js'

/**
 * CustomAction - Executes custom/placeholder actions
 *
 * No external dependencies required. Can be extended for future custom actions.
 */
export class CustomAction implements ActionHandler {
  type = 'custom'
  requires: string[] = []

  async execute(
    config: ActionConfig | null,
    instance: GamificationInstance,
    _connectionId: string
  ): Promise<ResultData> {
    const customActions = config?.customActions

    if (!customActions) {
      return {
        success: true,
        message: 'Action custom sans configuration spécifique',
      }
    }

    logger.info(
      {
        event: 'custom_action_executed',
        instanceId: instance.id,
        customActions,
      },
      'Action custom exécutée'
    )

    return {
      success: true,
      message: 'Action custom exécutée',
      actionResult: customActions,
    }
  }
}

export default CustomAction
