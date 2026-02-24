import type { TriggerConfig } from '#models/gamification_event'
import type { TriggerHandler, TriggerEvaluationResult } from '../types.js'

/**
 * ManualTrigger - Always triggers (MJ-initiated events)
 *
 * Manual triggers are explicitly activated by the GM.
 * They always pass evaluation.
 */
export class ManualTrigger implements TriggerHandler {
  type = 'manual'

  evaluate(_config: TriggerConfig | null, data: unknown): TriggerEvaluationResult {
    return {
      shouldTrigger: true,
      triggerData: { custom: data as Record<string, unknown> },
    }
  }
}

export default ManualTrigger
