import type { TriggerConfig, ActionConfig } from '#models/gamification_event'
import type { TriggerData, ResultData } from '#models/gamification_instance'
import type GamificationInstance from '#models/gamification_instance'
import type { CheckContext, CheckResult } from '#services/preflight/types'

/**
 * Result of a trigger evaluation.
 */
export interface TriggerEvaluationResult {
  shouldTrigger: boolean
  triggerData: TriggerData | null
  reason?: string
}

/**
 * TriggerHandler - Interface for pluggable trigger evaluators
 *
 * Implement this to add a new trigger type. The handler is auto-discovered
 * by the TriggerHandlerRegistry and used by TriggerEvaluator.
 *
 * Optional preFlightCheck() method auto-registers in the PreFlightRegistry.
 */
export interface TriggerHandler {
  /** Must match the GamificationTriggerType stored in the event's triggerType column */
  type: string

  /** Evaluate whether the trigger condition is met */
  evaluate(config: TriggerConfig | null, data: unknown): TriggerEvaluationResult

  /** Optional pre-flight check specific to this trigger type */
  preFlightCheck?(ctx: CheckContext): Promise<CheckResult>
}

/**
 * ActionHandler - Interface for pluggable action executors
 *
 * Implement this to add a new action type. The handler is auto-discovered
 * by the ActionHandlerRegistry and used by ActionExecutor.
 *
 * The `requires` array declares dependencies that the PreFlight system
 * can automatically validate before execution.
 */
export interface ActionHandler {
  /** Must match the GamificationActionType stored in the event's actionType column */
  type: string

  /**
   * Dependency keys this action needs to execute.
   * Used by PreFlight system to auto-validate requirements.
   * Examples: 'vtt_connection', 'twitch_chat', 'twitch_api'
   */
  requires: string[]

  /** Execute the action */
  execute(
    config: ActionConfig | null,
    instance: GamificationInstance,
    connectionId: string
  ): Promise<ResultData>

  /** Optional pre-flight check specific to this action type */
  preFlightCheck?(ctx: CheckContext): Promise<CheckResult>
}
