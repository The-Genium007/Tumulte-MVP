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
      await this.vttWebSocketService.broadcast(connectionId, `command:${action}`, {
        ...data,
        requestId,
        timestamp: new Date().toISOString(),
      })

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
}

export default FoundryCommandAdapter
