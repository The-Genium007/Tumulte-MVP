import logger from '@adonisjs/core/services/logger'
import Character from '#models/character'
import type { ActionConfig } from '#models/gamification_event'
import type GamificationInstance from '#models/gamification_instance'
import type { ResultData } from '#models/gamification_instance'
import type { FoundryCommandService } from '../../action_executor.js'
import type { ActionHandler } from '../types.js'

/**
 * DiceInvertAction - Inverts a critical dice roll via Foundry VTT
 *
 * 1. Deletes the original chat message (if configured)
 * 2. Re-rolls the dice with the inverted value
 * 3. Sends a troll message
 *
 * Requires: vtt_connection (needs Foundry to execute commands)
 */
export class DiceInvertAction implements ActionHandler {
  type = 'dice_invert'
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
    // Support for test mode: build diceData from customData
    let diceData = instance.triggerData?.diceRoll
    const customData = instance.triggerData?.custom as
      | { diceValue?: number; isTest?: boolean }
      | undefined

    const isTestMode = customData?.isTest === true

    if (!diceData && isTestMode && customData?.diceValue !== undefined) {
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
        { event: 'dice_invert_test_mode', instanceId: instance.id, diceValue },
        'Mode test: diceData généré à partir de customData'
      )
    }

    if (!diceData) {
      return { success: false, error: 'Données du dé manquantes' }
    }

    if (!this.foundryCommandService) {
      return { success: false, error: 'Service Foundry non disponible' }
    }

    // Resolve vttCharacterId from Tumulte characterId if available.
    // triggerData.diceRoll.characterId is a Tumulte UUID (PK of characters table),
    // but Foundry expects vttCharacterId (Foundry actor ID). We prefer the
    // enriched vttCharacterId if already present in triggerData (set by vtt_webhook_service).
    const vttCharacterId = await this.resolveVttCharacterId(
      diceData.characterId ?? null,
      instance.triggerData?.diceRoll?.vttCharacterId ?? undefined
    )

    const diceConfig = config?.diceInvert
    const trollMessage =
      diceConfig?.trollMessage || "🎭 Le chat a inversé le destin ! C'est leur faute..."

    const invertedResult = this.calculateInvertedResult(diceData.criticalType!)

    const actionResult: Record<string, unknown> = {
      originalResult: diceData.result,
      invertedResult,
      originalCriticalType: diceData.criticalType,
      newCriticalType: diceData.criticalType === 'success' ? 'failure' : 'success',
    }

    // Test mode: send original die first, then inverted
    if (isTestMode) {
      return await this.executeTestMode(
        connectionId,
        diceData,
        invertedResult,
        trollMessage,
        actionResult,
        instance.id,
        vttCharacterId
      )
    }

    // Normal mode: delete original and re-roll
    return await this.executeNormalMode(
      connectionId,
      diceData,
      invertedResult,
      trollMessage,
      actionResult,
      diceConfig?.deleteOriginal !== false,
      instance.id,
      vttCharacterId
    )
  }

  private async executeTestMode(
    connectionId: string,
    diceData: NonNullable<GamificationInstance['triggerData']>['diceRoll'] & {},
    invertedResult: number,
    trollMessage: string,
    actionResult: Record<string, unknown>,
    instanceId: string,
    vttCharacterId: string | null
  ): Promise<ResultData> {
    logger.info(
      { event: 'dice_invert_test_step1', instanceId, diceValue: diceData.result },
      'Mode test: envoi du dé original'
    )

    const originalRollResult = await this.foundryCommandService!.rollDice(
      connectionId,
      diceData.formula,
      diceData.result,
      `🎲 Test de dé critique: ${diceData.result}`,
      { characterId: vttCharacterId ?? undefined }
    )

    if (!originalRollResult.success) {
      return {
        success: false,
        error: `Échec du lancer de dé original: ${originalRollResult.error}`,
        actionResult,
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 1500))

    logger.info(
      { event: 'dice_invert_test_step2', instanceId, invertedResult },
      'Mode test: envoi du dé inversé avec message troll'
    )

    const invertedRollResult = await this.foundryCommandService!.rollDice(
      connectionId,
      diceData.formula,
      invertedResult,
      `${trollMessage}\n\n(Résultat original: ${diceData.result} → Inversé: ${invertedResult})`,
      { characterId: vttCharacterId ?? undefined }
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

  private async executeNormalMode(
    connectionId: string,
    diceData: NonNullable<GamificationInstance['triggerData']>['diceRoll'] & {},
    invertedResult: number,
    trollMessage: string,
    actionResult: Record<string, unknown>,
    shouldDeleteOriginal: boolean,
    instanceId: string,
    vttCharacterId: string | null
  ): Promise<ResultData> {
    if (shouldDeleteOriginal && diceData.messageId) {
      const deleteResult = await this.foundryCommandService!.deleteChatMessage(
        connectionId,
        diceData.messageId
      )

      if (!deleteResult.success) {
        logger.warn(
          {
            event: 'dice_invert_delete_failed',
            instanceId,
            messageId: diceData.messageId,
            error: deleteResult.error,
          },
          'Échec de la suppression du message original'
        )
      }
    }

    const rollResult = await this.foundryCommandService!.rollDice(
      connectionId,
      diceData.formula,
      invertedResult,
      `${trollMessage}\n\n(Résultat original: ${diceData.result} → Inversé: ${invertedResult})`,
      { characterId: vttCharacterId ?? undefined }
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
   * Resolve the Foundry VTT actor ID from a Tumulte character UUID.
   *
   * triggerData.diceRoll.characterId is a Tumulte PK (characters table),
   * but Foundry expects the vttCharacterId (Foundry actor ID like "Actor.xxxx").
   * If a pre-resolved vttCharacterId is provided (enriched trigger data), use it directly.
   */
  private async resolveVttCharacterId(
    tumulteCharacterId: string | null,
    preResolved?: string
  ): Promise<string | null> {
    if (preResolved) {
      return preResolved
    }

    if (!tumulteCharacterId) {
      return null
    }

    try {
      const character = await Character.find(tumulteCharacterId)
      if (character?.vttCharacterId) {
        logger.debug(
          {
            tumulteCharacterId,
            vttCharacterId: character.vttCharacterId,
            characterName: character.name,
          },
          '[DiceInvertAction] Resolved vttCharacterId from Tumulte UUID'
        )
        return character.vttCharacterId
      }

      logger.warn(
        { tumulteCharacterId },
        '[DiceInvertAction] Character found but has no vttCharacterId'
      )
      return null
    } catch (error) {
      logger.warn(
        { tumulteCharacterId, error: (error as Error).message },
        '[DiceInvertAction] Failed to resolve vttCharacterId'
      )
      return null
    }
  }

  private calculateInvertedResult(criticalType: 'success' | 'failure'): number {
    const diceMax = 20
    const diceMin = 1
    return criticalType === 'success' ? diceMin : diceMax
  }
}

export default DiceInvertAction
