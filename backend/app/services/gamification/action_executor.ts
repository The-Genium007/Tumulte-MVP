import logger from '@adonisjs/core/services/logger'
import type GamificationEvent from '#models/gamification_event'
import type GamificationInstance from '#models/gamification_instance'
import type { ResultData } from '#models/gamification_instance'
import type { ActionHandlerRegistry } from './handlers/action_handler_registry.js'
import { buildNotificationMessage } from './twitch_chat_notifier.js'

/**
 * Interface minimale pour le service de chat Twitch
 * (évite un import circulaire avec le module complet)
 */
export interface TwitchChatNotifier {
  sendMessage(streamerId: string, message: string): Promise<void>
}

/**
 * Interface pour le service de commandes Foundry
 * Sera implementee dans la Phase C
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

  applySpellEffect(
    connectionId: string,
    data: {
      actorId: string
      spellId: string
      spellName: string
      effect: {
        type: 'disable' | 'buff' | 'debuff'
        durationSeconds?: number
        buffType?: 'advantage' | 'bonus'
        debuffType?: 'disadvantage' | 'penalty'
        bonusValue?: number
        penaltyValue?: number
        highlightColor?: string
        message?: string
        triggeredBy?: string
      }
    }
  ): Promise<{ success: boolean; error?: string }>

  applyMonsterEffect(
    connectionId: string,
    data: {
      actorId: string
      monsterName: string
      monsterImg?: string
      effect: {
        type: 'buff' | 'debuff'
        acBonus?: number
        acPenalty?: number
        tempHp?: number
        maxHpReduction?: number
        highlightColor?: string
        message?: string
        triggeredBy?: string
      }
    }
  ): Promise<{ success: boolean; error?: string }>

  cleanupAllEffects(
    connectionId: string,
    options?: { cleanChat?: boolean }
  ): Promise<{ success: boolean; error?: string }>
}

/**
 * ActionExecutor - Execution des actions de gamification
 *
 * Delegates to registered ActionHandlers via the ActionHandlerRegistry.
 * Adding a new action type requires only registering a new handler — no changes here.
 */
export class ActionExecutor {
  private twitchChatNotifier: TwitchChatNotifier | null = null

  constructor(private registry?: ActionHandlerRegistry) {}

  /**
   * Injecte le service de notification chat Twitch
   * Appelé lors de l'initialisation dans le container IoC.
   */
  setTwitchChatNotifier(service: TwitchChatNotifier): void {
    this.twitchChatNotifier = service
  }

  /**
   * Injecte le service de commandes Foundry
   * Appelé lors de l'initialisation du service principal.
   * Propagates to all registered action handlers that need it.
   */
  setFoundryCommandService(service: FoundryCommandService): void {
    // Propagate to all handlers that have a setFoundryCommandService method
    if (this.registry) {
      for (const handler of this.registry.all()) {
        if (
          'setFoundryCommandService' in handler &&
          typeof handler.setFoundryCommandService === 'function'
        ) {
          ;(
            handler as { setFoundryCommandService: (s: FoundryCommandService) => void }
          ).setFoundryCommandService(service)
        }
      }
    }
  }

  /**
   * Execute l'action associee a un evenement
   *
   * @param event - Definition de l'evenement
   * @param instance - Instance completee
   * @param connectionId - ID de la connexion VTT
   * @returns Donnees de resultat
   */
  async execute(
    event: GamificationEvent,
    instance: GamificationInstance,
    connectionId: string
  ): Promise<ResultData> {
    try {
      if (!this.registry) {
        return {
          success: false,
          error: 'ActionHandlerRegistry non disponible',
        }
      }

      const handler = this.registry.get(event.actionType)

      if (!handler) {
        logger.warn(
          { actionType: event.actionType, eventId: event.id },
          `[ActionExecutor] Unknown action type: ${event.actionType}`
        )
        return {
          success: false,
          error: `Type d'action inconnu: ${event.actionType}`,
        }
      }

      const result = await handler.execute(event.actionConfig, instance, connectionId)

      // Fire-and-forget Twitch chat notification on success
      if (result.success && instance.streamerId && this.twitchChatNotifier) {
        const message = buildNotificationMessage({
          actionType: event.actionType,
          resultData: result,
        })
        if (message) {
          this.twitchChatNotifier.sendMessage(instance.streamerId, message).catch((err) => {
            logger.warn(
              { err, streamerId: instance.streamerId, actionType: event.actionType },
              'Twitch chat notification failed'
            )
          })
        }
      }

      return result
    } catch (error) {
      logger.error(
        {
          event: 'action_execution_error',
          instanceId: instance.id,
          actionType: event.actionType,
          error: error instanceof Error ? error.message : String(error),
        },
        "Erreur lors de l'execution de l'action"
      )

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      }
    }
  }
}

export default ActionExecutor
