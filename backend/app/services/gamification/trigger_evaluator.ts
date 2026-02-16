import logger from '@adonisjs/core/services/logger'
import type GamificationEvent from '#models/gamification_event'
import type { TriggerHandlerRegistry } from './handlers/trigger_handler_registry.js'
import type { TriggerEvaluationResult } from './handlers/types.js'

// Re-export for backward compatibility (imported by gamification_service.ts)
export type { TriggerEvaluationResult } from './handlers/types.js'
export type { DiceRollData } from './handlers/triggers/dice_critical_trigger.js'

/**
 * TriggerEvaluator - Evaluation des declencheurs de gamification
 *
 * Delegates to registered TriggerHandlers via the TriggerHandlerRegistry.
 * Adding a new trigger type requires only registering a new handler — no changes here.
 */
export class TriggerEvaluator {
  constructor(private registry: TriggerHandlerRegistry) {}

  /**
   * Evalue si un evenement doit etre declenche
   *
   * @param event - Definition de l'evenement
   * @param data - Donnees source (de, etc.)
   * @returns Resultat de l'evaluation avec les donnees de trigger si applicable
   */
  evaluate(event: GamificationEvent, data: unknown): TriggerEvaluationResult {
    const handler = this.registry.get(event.triggerType)

    if (!handler) {
      logger.warn(
        { triggerType: event.triggerType, eventId: event.id },
        `[TriggerEvaluator] Unknown trigger type: ${event.triggerType}`
      )
      return {
        shouldTrigger: false,
        triggerData: null,
        reason: `Type de trigger inconnu: ${event.triggerType}`,
      }
    }

    return handler.evaluate(event.triggerConfig, data)
  }

  /**
   * Verifie si un type de trigger est supporte
   *
   * @param triggerType - Type de trigger a verifier
   * @returns true si le type est supporte
   */
  isSupportedTriggerType(triggerType: string): boolean {
    return this.registry.has(triggerType)
  }
}

export default TriggerEvaluator
