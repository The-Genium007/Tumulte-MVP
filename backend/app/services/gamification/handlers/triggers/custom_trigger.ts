import type { TriggerConfig } from '#models/gamification_event'
import type { TriggerHandler, TriggerEvaluationResult } from '../types.js'

/**
 * CustomTrigger - Evaluates custom trigger rules
 *
 * Passes if data is provided. Can be extended with custom rule evaluation.
 */
export class CustomTrigger implements TriggerHandler {
  type = 'custom'

  evaluate(_config: TriggerConfig | null, data: unknown): TriggerEvaluationResult {
    if (!data) {
      return {
        shouldTrigger: false,
        triggerData: null,
        reason: 'Pas de données pour le trigger custom',
      }
    }

    return {
      shouldTrigger: true,
      triggerData: {
        custom: data as Record<string, unknown>,
      },
    }
  }
}

export default CustomTrigger
