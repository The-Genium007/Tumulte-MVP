import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import GamificationEvent, { type ActionConfig } from '#models/gamification_event'
import GamificationInstance, { type ResultData } from '#models/gamification_instance'

/**
 * Interface pour le service de commandes Foundry
 * Sera implémenté dans la Phase C
 */
export interface FoundryCommandService {
  sendChatMessage(
    connectionId: string,
    content: string,
    speaker?: string
  ): Promise<{ success: boolean; error?: string }>

  deleteChatMessage(
    connectionId: string,
    messageId: string
  ): Promise<{ success: boolean; error?: string }>

  rollDice(
    connectionId: string,
    formula: string,
    forcedResult: number,
    flavor: string,
    speaker?: { characterId?: string }
  ): Promise<{ success: boolean; error?: string }>

  modifyActor(
    connectionId: string,
    actorId: string,
    updates: Record<string, unknown>
  ): Promise<{ success: boolean; error?: string }>
}

/**
 * ActionExecutor - Exécution des actions de gamification
 *
 * Exécute les actions configurées quand un objectif est atteint.
 * Communique avec Foundry pour appliquer les effets in-game.
 */
@inject()
export class ActionExecutor {
  private foundryCommandService: FoundryCommandService | null = null

  /**
   * Injecte le service de commandes Foundry
   * Appelé lors de l'initialisation du service principal
   */
  setFoundryCommandService(service: FoundryCommandService): void {
    this.foundryCommandService = service
  }

  /**
   * Exécute l'action associée à un événement
   *
   * @param event - Définition de l'événement
   * @param instance - Instance complétée
   * @param connectionId - ID de la connexion VTT
   * @returns Données de résultat
   */
  async execute(
    event: GamificationEvent,
    instance: GamificationInstance,
    connectionId: string
  ): Promise<ResultData> {
    try {
      switch (event.actionType) {
        case 'dice_invert':
          return await this.executeDiceInvert(event.actionConfig, instance, connectionId)

        case 'chat_message':
          return await this.executeChatMessage(event.actionConfig, instance, connectionId)

        case 'stat_modify':
          return await this.executeStatModify(event.actionConfig, instance, connectionId)

        case 'custom':
          return await this.executeCustom(event.actionConfig, instance, connectionId)

        default:
          return {
            success: false,
            error: `Type d'action inconnu: ${event.actionType}`,
          }
      }
    } catch (error) {
      logger.error(
        {
          event: 'action_execution_error',
          instanceId: instance.id,
          actionType: event.actionType,
          error: error instanceof Error ? error.message : String(error),
        },
        "Erreur lors de l'exécution de l'action"
      )

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      }
    }
  }

  /**
   * Exécute l'action d'inversion de dé
   *
   * 1. Supprime le message original du chat Foundry
   * 2. Relance le dé avec la valeur inversée
   * 3. Envoie un message troll
   */
  private async executeDiceInvert(
    config: ActionConfig | null,
    instance: GamificationInstance,
    connectionId: string
  ): Promise<ResultData> {
    // Support for test mode: build diceData from customData
    let diceData = instance.triggerData?.diceRoll
    const customData = instance.triggerData?.custom as
      | { diceValue?: number; isTest?: boolean }
      | undefined

    const isTestMode = customData?.isTest === true

    if (!diceData && isTestMode && customData?.diceValue !== undefined) {
      // Build fake diceRoll for testing
      const diceValue = customData.diceValue

      diceData = {
        rollId: `test-${Date.now()}`,
        characterId: 'test-character',
        characterName: 'Test Character',
        formula: '1d20',
        result: diceValue,
        diceResults: [diceValue],
        criticalType: diceValue === 20 ? 'success' : 'failure',
      }

      logger.info(
        {
          event: 'dice_invert_test_mode',
          instanceId: instance.id,
          diceValue,
        },
        'Mode test: diceData généré à partir de customData'
      )
    }

    if (!diceData) {
      return {
        success: false,
        error: 'Données du dé manquantes',
      }
    }

    // Check if Foundry service is available
    if (!this.foundryCommandService) {
      return {
        success: false,
        error: 'Service Foundry non disponible',
      }
    }

    const diceConfig = config?.diceInvert
    const trollMessage =
      diceConfig?.trollMessage || "🎭 Le chat a inversé le destin ! C'est leur faute..."

    // Calcul de la valeur inversée
    // Pour un D20: 20 devient 1, 1 devient 20
    const invertedResult = this.calculateInvertedResult(
      diceData.diceResults,
      diceData.criticalType!
    )

    const actionResult: Record<string, unknown> = {
      originalResult: diceData.result,
      invertedResult,
      originalCriticalType: diceData.criticalType,
      newCriticalType: diceData.criticalType === 'success' ? 'failure' : 'success',
    }

    // En mode test: on doit d'abord envoyer le dé original avant de l'inverser
    if (isTestMode) {
      logger.info(
        {
          event: 'dice_invert_test_step1',
          instanceId: instance.id,
          diceValue: diceData.result,
        },
        'Mode test: envoi du dé original'
      )

      // Étape 1: Envoyer le dé original
      const originalRollResult = await this.foundryCommandService.rollDice(
        connectionId,
        diceData.formula,
        diceData.result,
        `🎲 Test de dé critique: ${diceData.result}`,
        { characterId: diceData.characterId ?? undefined }
      )

      if (!originalRollResult.success) {
        return {
          success: false,
          error: `Échec du lancer de dé original: ${originalRollResult.error}`,
          actionResult,
        }
      }

      // Étape 2: Attendre un peu pour que le dé soit visible (1.5 secondes)
      await new Promise((resolve) => setTimeout(resolve, 1500))

      logger.info(
        {
          event: 'dice_invert_test_step2',
          instanceId: instance.id,
          invertedResult,
        },
        'Mode test: envoi du dé inversé avec message troll'
      )

      // Étape 3: Envoyer le dé inversé avec le message troll
      const invertedRollResult = await this.foundryCommandService.rollDice(
        connectionId,
        diceData.formula,
        invertedResult,
        `${trollMessage}\n\n(Résultat original: ${diceData.result} → Inversé: ${invertedResult})`,
        { characterId: diceData.characterId ?? undefined }
      )

      if (!invertedRollResult.success) {
        return {
          success: false,
          error: `Échec du lancer de dé inversé: ${invertedRollResult.error}`,
          actionResult,
        }
      }

      return {
        success: true,
        message: `[TEST] Dé inversé: ${diceData.result} → ${invertedResult}`,
        actionResult: { ...actionResult, testMode: true },
      }
    }

    // Mode normal: le dé a déjà été lancé par un joueur, on supprime et relance
    const shouldDeleteOriginal = diceConfig?.deleteOriginal !== false

    // Étape 1: Supprimer le message original (si configuré)
    if (shouldDeleteOriginal && diceData.messageId) {
      const deleteResult = await this.foundryCommandService.deleteChatMessage(
        connectionId,
        diceData.messageId
      )

      if (!deleteResult.success) {
        logger.warn(
          {
            event: 'dice_invert_delete_failed',
            instanceId: instance.id,
            messageId: diceData.messageId,
            error: deleteResult.error,
          },
          'Échec de la suppression du message original'
        )
        // On continue quand même
      }
    }

    // Étape 2: Relancer le dé avec la valeur inversée
    const rollResult = await this.foundryCommandService.rollDice(
      connectionId,
      diceData.formula,
      invertedResult,
      `${trollMessage}\n\n(Résultat original: ${diceData.result} → Inversé: ${invertedResult})`,
      { characterId: diceData.characterId ?? undefined }
    )

    if (!rollResult.success) {
      return {
        success: false,
        error: `Échec du lancer de dé inversé: ${rollResult.error}`,
        actionResult,
      }
    }

    return {
      success: true,
      message: `Dé inversé: ${diceData.result} → ${invertedResult}`,
      actionResult,
    }
  }

  /**
   * Calcule le résultat inversé d'un jet de dé
   *
   * Pour un critique réussite → échec critique (valeur min)
   * Pour un critique échec → réussite critique (valeur max)
   */
  private calculateInvertedResult(
    _diceResults: number[],
    criticalType: 'success' | 'failure'
  ): number {
    // On suppose un D20 standard pour l'instant
    // TODO: Supporter d'autres types de dés via la config
    const diceMax = 20
    const diceMin = 1

    if (criticalType === 'success') {
      // Réussite critique → Échec critique
      return diceMin
    } else {
      // Échec critique → Réussite critique
      return diceMax
    }
  }

  /**
   * Exécute l'action d'envoi de message chat
   */
  private async executeChatMessage(
    config: ActionConfig | null,
    _instance: GamificationInstance,
    connectionId: string
  ): Promise<ResultData> {
    if (!this.foundryCommandService) {
      return {
        success: false,
        error: 'Service Foundry non disponible',
      }
    }

    const chatConfig = config?.chatMessage
    if (!chatConfig?.content) {
      return {
        success: false,
        error: 'Contenu du message manquant',
      }
    }

    const result = await this.foundryCommandService.sendChatMessage(
      connectionId,
      chatConfig.content,
      chatConfig.speaker
    )

    return {
      success: result.success,
      message: result.success ? 'Message envoyé' : undefined,
      error: result.error,
    }
  }

  /**
   * Exécute l'action de modification de stats
   */
  private async executeStatModify(
    config: ActionConfig | null,
    _instance: GamificationInstance,
    connectionId: string
  ): Promise<ResultData> {
    if (!this.foundryCommandService) {
      return {
        success: false,
        error: 'Service Foundry non disponible',
      }
    }

    const statConfig = config?.statModify
    if (!statConfig?.actorId || !statConfig?.updates) {
      return {
        success: false,
        error: 'Configuration de modification de stats incomplète',
      }
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

  /**
   * Exécute une action personnalisée
   *
   * Pour l'instant, envoie juste un message de confirmation.
   * Peut être étendu pour supporter des actions custom.
   */
  private async executeCustom(
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

    // TODO: Implémenter le traitement des actions custom
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

export default ActionExecutor
