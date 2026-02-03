import GamificationEvent, {
  type TriggerConfig,
  type GamificationTriggerType,
} from '#models/gamification_event'
import type { TriggerData } from '#models/gamification_instance'

/**
 * Données d'un jet de dé reçu depuis Foundry
 *
 * Note: characterId et characterName peuvent être null pour les jets MJ
 * en attente d'attribution ou ignorés.
 */
export interface DiceRollData {
  rollId: string
  characterId: string | null
  characterName: string | null
  formula: string
  result: number
  diceResults: number[]
  isCritical: boolean
  criticalType: 'success' | 'failure' | null
  messageId?: string
}

/**
 * Résultat de l'évaluation d'un trigger
 */
export interface TriggerEvaluationResult {
  shouldTrigger: boolean
  triggerData: TriggerData | null
  reason?: string
}

/**
 * TriggerEvaluator - Évaluation des déclencheurs de gamification
 *
 * Détermine si un événement doit être déclenché en fonction des règles
 * configurées et des données reçues.
 */
export class TriggerEvaluator {
  /**
   * Évalue si un événement doit être déclenché
   *
   * @param event - Définition de l'événement
   * @param data - Données source (dé, etc.)
   * @returns Résultat de l'évaluation avec les données de trigger si applicable
   */
  evaluate(event: GamificationEvent, data: unknown): TriggerEvaluationResult {
    switch (event.triggerType) {
      case 'dice_critical':
        return this.evaluateDiceCritical(event.triggerConfig, data as DiceRollData)

      case 'manual':
        // Les triggers manuels sont toujours déclenchés par le MJ
        return {
          shouldTrigger: true,
          triggerData: { custom: data as Record<string, unknown> },
        }

      case 'custom':
        return this.evaluateCustom(event.triggerConfig, data)

      default:
        return {
          shouldTrigger: false,
          triggerData: null,
          reason: `Type de trigger inconnu: ${event.triggerType}`,
        }
    }
  }

  /**
   * Évalue un trigger de type dice_critical
   *
   * Vérifie si le jet de dé correspond aux critères de réussite/échec critique
   * configurés dans l'événement.
   *
   * @param config - Configuration du trigger
   * @param diceRoll - Données du jet de dé
   * @returns Résultat de l'évaluation
   */
  evaluateDiceCritical(
    config: TriggerConfig | null,
    diceRoll: DiceRollData
  ): TriggerEvaluationResult {
    // Si pas de config ou pas de critique, pas de trigger
    if (!config || !diceRoll.isCritical || !diceRoll.criticalType) {
      return {
        shouldTrigger: false,
        triggerData: null,
        reason: 'Pas un jet critique ou configuration manquante',
      }
    }

    const { criticalSuccess, criticalFailure } = config

    // Vérifie si c'est une réussite critique activée
    if (diceRoll.criticalType === 'success' && criticalSuccess?.enabled) {
      // Si un seuil est défini, vérifie que le résultat l'atteint
      if (criticalSuccess.threshold !== undefined) {
        // Pour une réussite, on vérifie que le résultat est >= seuil
        const maxDie = Math.max(...diceRoll.diceResults)
        if (maxDie < criticalSuccess.threshold) {
          return {
            shouldTrigger: false,
            triggerData: null,
            reason: `Résultat ${maxDie} < seuil ${criticalSuccess.threshold}`,
          }
        }
      }

      return {
        shouldTrigger: true,
        triggerData: this.extractDiceTriggerData(diceRoll),
      }
    }

    // Vérifie si c'est un échec critique activé
    if (diceRoll.criticalType === 'failure' && criticalFailure?.enabled) {
      // Si un seuil est défini, vérifie que le résultat l'atteint
      if (criticalFailure.threshold !== undefined) {
        // Pour un échec, on vérifie que le résultat est <= seuil
        const minDie = Math.min(...diceRoll.diceResults)
        if (minDie > criticalFailure.threshold) {
          return {
            shouldTrigger: false,
            triggerData: null,
            reason: `Résultat ${minDie} > seuil ${criticalFailure.threshold}`,
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

  /**
   * Extrait les données de trigger à partir d'un jet de dé
   *
   * @param diceRoll - Données du jet de dé
   * @returns Données de trigger formatées
   */
  private extractDiceTriggerData(diceRoll: DiceRollData): TriggerData {
    return {
      diceRoll: {
        rollId: diceRoll.rollId,
        characterId: diceRoll.characterId,
        characterName: diceRoll.characterName,
        formula: diceRoll.formula,
        result: diceRoll.result,
        diceResults: diceRoll.diceResults,
        criticalType: diceRoll.criticalType!,
        messageId: diceRoll.messageId,
      },
    }
  }

  /**
   * Évalue un trigger personnalisé
   *
   * Pour l'instant, les triggers custom passent toujours.
   * Peut être étendu avec des règles personnalisées.
   *
   * @param config - Configuration du trigger
   * @param data - Données source
   * @returns Résultat de l'évaluation
   */
  private evaluateCustom(_config: TriggerConfig | null, data: unknown): TriggerEvaluationResult {
    // Les triggers custom peuvent avoir des règles personnalisées
    // Pour l'instant, on les laisse passer si des données sont fournies
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

  /**
   * Vérifie si un type de trigger est supporté
   *
   * @param triggerType - Type de trigger à vérifier
   * @returns true si le type est supporté
   */
  isSupportedTriggerType(triggerType: string): triggerType is GamificationTriggerType {
    return ['dice_critical', 'manual', 'custom'].includes(triggerType)
  }
}

export default TriggerEvaluator
