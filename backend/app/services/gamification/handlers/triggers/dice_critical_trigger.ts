import type { TriggerConfig } from '#models/gamification_event'
import type { TriggerData } from '#models/gamification_instance'
import type { TriggerHandler, TriggerEvaluationResult } from '../types.js'

export interface DiceRollData {
  rollId: string
  /** Tumulte character UUID (PK of characters table) */
  characterId: string | null
  /** Foundry VTT actor ID — resolved at source to avoid UUID confusion */
  vttCharacterId?: string | null
  characterName: string | null
  formula: string
  result: number
  diceResults: number[]
  isCritical: boolean
  criticalType: 'success' | 'failure' | null
  // Criticality enrichment V2
  severity?: 'minor' | 'major' | 'extreme' | null
  criticalLabel?: string | null
  criticalCategory?: string | null
  messageId?: string
}

/**
 * DiceCriticalTrigger - Evaluates dice critical hit triggers
 *
 * Checks if a dice roll matches the configured critical success/failure
 * thresholds for the event.
 */
export class DiceCriticalTrigger implements TriggerHandler {
  type = 'dice_critical'

  evaluate(config: TriggerConfig | null, data: unknown): TriggerEvaluationResult {
    const diceRoll = data as DiceRollData

    if (!config || !diceRoll.isCritical || !diceRoll.criticalType) {
      return {
        shouldTrigger: false,
        triggerData: null,
        reason: 'Pas un jet critique ou configuration manquante',
      }
    }

    const { criticalSuccess, criticalFailure } = config

    // Check critical success
    if (diceRoll.criticalType === 'success' && criticalSuccess?.enabled) {
      if (criticalSuccess.threshold !== undefined) {
        const maxDie = Math.max(...diceRoll.diceResults)
        if (maxDie < criticalSuccess.threshold) {
          return {
            shouldTrigger: false,
            triggerData: null,
            reason: `Résultat ${maxDie} < seuil ${criticalSuccess.threshold}`,
          }
        }
      }

      // Severity filter (V2): skip if severity doesn't match
      if (criticalSuccess.severityFilter?.length && diceRoll.severity) {
        if (!criticalSuccess.severityFilter.includes(diceRoll.severity)) {
          return {
            shouldTrigger: false,
            triggerData: null,
            reason: `Sévérité '${diceRoll.severity}' exclue par le filtre`,
          }
        }
      }

      // Category filter (V2): skip if category doesn't match
      if (criticalSuccess.categoryFilter?.length && diceRoll.criticalCategory) {
        if (!criticalSuccess.categoryFilter.includes(diceRoll.criticalCategory)) {
          return {
            shouldTrigger: false,
            triggerData: null,
            reason: `Catégorie '${diceRoll.criticalCategory}' exclue par le filtre`,
          }
        }
      }

      return {
        shouldTrigger: true,
        triggerData: this.extractDiceTriggerData(diceRoll),
      }
    }

    // Check critical failure
    if (diceRoll.criticalType === 'failure' && criticalFailure?.enabled) {
      if (criticalFailure.threshold !== undefined) {
        const minDie = Math.min(...diceRoll.diceResults)
        if (minDie > criticalFailure.threshold) {
          return {
            shouldTrigger: false,
            triggerData: null,
            reason: `Résultat ${minDie} > seuil ${criticalFailure.threshold}`,
          }
        }
      }

      // Severity filter (V2)
      if (criticalFailure.severityFilter?.length && diceRoll.severity) {
        if (!criticalFailure.severityFilter.includes(diceRoll.severity)) {
          return {
            shouldTrigger: false,
            triggerData: null,
            reason: `Sévérité '${diceRoll.severity}' exclue par le filtre`,
          }
        }
      }

      // Category filter (V2)
      if (criticalFailure.categoryFilter?.length && diceRoll.criticalCategory) {
        if (!criticalFailure.categoryFilter.includes(diceRoll.criticalCategory)) {
          return {
            shouldTrigger: false,
            triggerData: null,
            reason: `Catégorie '${diceRoll.criticalCategory}' exclue par le filtre`,
          }
        }
      }

      return {
        shouldTrigger: true,
        triggerData: this.extractDiceTriggerData(diceRoll),
      }
    }

    return {
      shouldTrigger: false,
      triggerData: null,
      reason: 'Type de critique non activé dans la configuration',
    }
  }

  private extractDiceTriggerData(diceRoll: DiceRollData): TriggerData {
    return {
      diceRoll: {
        rollId: diceRoll.rollId,
        characterId: diceRoll.characterId,
        vttCharacterId: diceRoll.vttCharacterId ?? null,
        characterName: diceRoll.characterName,
        formula: diceRoll.formula,
        result: diceRoll.result,
        diceResults: diceRoll.diceResults,
        criticalType: diceRoll.criticalType!,
        messageId: diceRoll.messageId,
      },
    }
  }
}

export default DiceCriticalTrigger
