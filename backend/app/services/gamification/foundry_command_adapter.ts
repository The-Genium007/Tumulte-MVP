import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import VttConnection from '#models/vtt_connection'
import VttWebSocketService from '#services/vtt/vtt_websocket_service'
import type { FoundryCommandService } from './action_executor.js'

/**
 * FoundryCommandAdapter - Adapte les commandes de gamification vers Foundry VTT
 *
 * Implémente l'interface FoundryCommandService en utilisant le WebSocket tunnel
 * pour envoyer les commandes à Foundry VTT.
 *
 * Note: Le module Foundry doit écouter les événements 'command:*' côté client.
 */
@inject()
export class FoundryCommandAdapter implements FoundryCommandService {
  constructor(private vttWebSocketService: VttWebSocketService) {}

  /**
   * Envoie une commande via WebSocket à Foundry VTT
   *
   * Le module Foundry doit écouter les événements 'command:*' côté client
   * et exécuter les actions correspondantes.
   */
  private async sendCommand(
    connectionId: string,
    action: string,
    data: Record<string, unknown>
  ): Promise<{ success: boolean; error?: string }> {
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    logger.info(
      {
        event: 'foundry_command_sending',
        connectionId,
        action,
        requestId,
      },
      'Envoi de commande à Foundry via WebSocket'
    )

    try {
      const delivered = await this.vttWebSocketService.broadcast(
        connectionId,
        `command:${action}`,
        {
          ...data,
          requestId,
          timestamp: new Date().toISOString(),
        }
      )

      if (!delivered) {
        logger.error(
          {
            event: 'foundry_command_no_receiver',
            connectionId,
            action,
            requestId,
          },
          'Aucun socket Foundry connecté — la commande ne sera pas reçue'
        )
        return {
          success: false,
          error: 'Module Foundry non connecté (aucun socket actif dans la room)',
        }
      }

      logger.info(
        {
          event: 'foundry_command_sent',
          connectionId,
          action,
          requestId,
        },
        'Commande envoyée à Foundry'
      )

      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error(
        {
          event: 'foundry_command_error',
          connectionId,
          action,
          error: errorMessage,
        },
        "Erreur lors de l'envoi de la commande"
      )
      return { success: false, error: errorMessage }
    }
  }

  /**
   * Envoie un message dans le chat Foundry
   */
  async sendChatMessage(
    connectionId: string,
    content: string,
    speaker?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Vérifier que la connexion existe et est active
      const connection = await VttConnection.find(connectionId)
      if (!connection || connection.tunnelStatus !== 'connected') {
        return {
          success: false,
          error: 'Connexion VTT non disponible ou déconnectée',
        }
      }

      const result = await this.sendCommand(connectionId, 'chat_message', {
        content,
        speaker: speaker ? { alias: speaker } : undefined,
      })

      if (result.success) {
        logger.info(
          {
            event: 'foundry_chat_message_sent',
            connectionId,
            contentLength: content.length,
          },
          'Message chat envoyé à Foundry'
        )
      }

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error(
        {
          event: 'foundry_chat_message_error',
          connectionId,
          error: errorMessage,
        },
        "Erreur lors de l'envoi du message chat"
      )
      return { success: false, error: errorMessage }
    }
  }

  /**
   * Supprime un message du chat Foundry
   */
  async deleteChatMessage(
    connectionId: string,
    messageId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const connection = await VttConnection.find(connectionId)
      if (!connection || connection.tunnelStatus !== 'connected') {
        return {
          success: false,
          error: 'Connexion VTT non disponible ou déconnectée',
        }
      }

      const result = await this.sendCommand(connectionId, 'delete_message', {
        messageId,
      })

      if (result.success) {
        logger.info(
          {
            event: 'foundry_message_deleted',
            connectionId,
            messageId,
          },
          'Message supprimé dans Foundry'
        )
      }

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error(
        {
          event: 'foundry_delete_message_error',
          connectionId,
          messageId,
          error: errorMessage,
        },
        'Erreur lors de la suppression du message'
      )
      return { success: false, error: errorMessage }
    }
  }

  /**
   * Lance un dé dans Foundry avec un résultat forcé
   */
  async rollDice(
    connectionId: string,
    formula: string,
    forcedResult: number,
    flavor: string,
    speaker?: { characterId?: string }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const connection = await VttConnection.find(connectionId)
      if (!connection || connection.tunnelStatus !== 'connected') {
        return {
          success: false,
          error: 'Connexion VTT non disponible ou déconnectée',
        }
      }

      const result = await this.sendCommand(connectionId, 'roll_dice', {
        formula,
        forcedResult,
        flavor,
        speaker: speaker?.characterId ? { actorId: speaker.characterId } : undefined,
      })

      if (result.success) {
        logger.info(
          {
            event: 'foundry_dice_roll_sent',
            connectionId,
            formula,
            forcedResult,
            characterId: speaker?.characterId,
          },
          'Lancer de dé envoyé à Foundry'
        )
      }

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error(
        {
          event: 'foundry_dice_roll_error',
          connectionId,
          formula,
          error: errorMessage,
        },
        "Erreur lors de l'envoi du lancer de dé"
      )
      return { success: false, error: errorMessage }
    }
  }

  /**
   * Modifie les stats d'un acteur dans Foundry
   */
  async modifyActor(
    connectionId: string,
    actorId: string,
    updates: Record<string, unknown>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const connection = await VttConnection.find(connectionId)
      if (!connection || connection.tunnelStatus !== 'connected') {
        return {
          success: false,
          error: 'Connexion VTT non disponible ou déconnectée',
        }
      }

      const result = await this.sendCommand(connectionId, 'modify_actor', {
        actorId,
        updates,
      })

      if (result.success) {
        logger.info(
          {
            event: 'foundry_actor_modified',
            connectionId,
            actorId,
            updateKeys: Object.keys(updates),
          },
          'Acteur modifié dans Foundry'
        )
      }

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error(
        {
          event: 'foundry_modify_actor_error',
          connectionId,
          actorId,
          error: errorMessage,
        },
        "Erreur lors de la modification de l'acteur"
      )
      return { success: false, error: errorMessage }
    }
  }
  /**
   * Applique un effet de sort sur un acteur dans Foundry
   */
  async applySpellEffect(
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
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const connection = await VttConnection.find(connectionId)
      if (!connection || connection.tunnelStatus !== 'connected') {
        return {
          success: false,
          error: 'Connexion VTT non disponible ou déconnectée',
        }
      }

      const result = await this.sendCommand(connectionId, 'apply_spell_effect', data)

      if (result.success) {
        logger.info(
          {
            event: 'foundry_spell_effect_applied',
            connectionId,
            actorId: data.actorId,
            spellId: data.spellId,
            spellName: data.spellName,
            effectType: data.effect.type,
          },
          'Effet de sort appliqué dans Foundry'
        )
      }

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error(
        {
          event: 'foundry_spell_effect_error',
          connectionId,
          actorId: data.actorId,
          spellId: data.spellId,
          error: errorMessage,
        },
        "Erreur lors de l'application de l'effet de sort"
      )
      return { success: false, error: errorMessage }
    }
  }
  /**
   * Applique un effet de monstre (buff/debuff) sur un acteur hostile dans Foundry
   */
  async applyMonsterEffect(
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
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const connection = await VttConnection.find(connectionId)
      if (!connection || connection.tunnelStatus !== 'connected') {
        return {
          success: false,
          error: 'Connexion VTT non disponible ou déconnectée',
        }
      }

      const result = await this.sendCommand(connectionId, 'apply_monster_effect', data)

      if (result.success) {
        logger.info(
          {
            event: 'foundry_monster_effect_applied',
            connectionId,
            actorId: data.actorId,
            monsterName: data.monsterName,
            effectType: data.effect.type,
          },
          'Effet de monstre appliqué dans Foundry'
        )
      }

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error(
        {
          event: 'foundry_monster_effect_error',
          connectionId,
          actorId: data.actorId,
          error: errorMessage,
        },
        "Erreur lors de l'application de l'effet de monstre"
      )
      return { success: false, error: errorMessage }
    }
  }

  /**
   * Envoie une commande de nettoyage global à Foundry
   * Supprime tous les flags Tumulte, restaure les sorts, annule les timers
   */
  async cleanupAllEffects(
    connectionId: string,
    options?: { cleanChat?: boolean }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const connection = await VttConnection.find(connectionId)
      if (!connection || connection.tunnelStatus !== 'connected') {
        return {
          success: false,
          error: 'Connexion VTT non disponible ou déconnectée',
        }
      }

      const result = await this.sendCommand(connectionId, 'cleanup_all_effects', {
        cleanChat: options?.cleanChat ?? false,
      })

      if (result.success) {
        logger.info(
          {
            event: 'foundry_cleanup_all_effects_sent',
            connectionId,
            cleanChat: options?.cleanChat ?? false,
          },
          'Commande de nettoyage global envoyée à Foundry'
        )
      }

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error(
        {
          event: 'foundry_cleanup_all_effects_error',
          connectionId,
          error: errorMessage,
        },
        "Erreur lors de l'envoi du nettoyage global"
      )
      return { success: false, error: errorMessage }
    }
  }
}

export default FoundryCommandAdapter
