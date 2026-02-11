import type { ActionConfig } from '#models/gamification_event'
import type GamificationInstance from '#models/gamification_instance'
import type { ResultData } from '#models/gamification_instance'
import type { FoundryCommandService } from '../../action_executor.js'
import type { ActionHandler } from '../types.js'

/**
 * ChatMessageAction - Sends a chat message to Foundry VTT
 *
 * Requires: vtt_connection
 */
export class ChatMessageAction implements ActionHandler {
  type = 'chat_message'
  requires = ['vtt_connection']

  private foundryCommandService: FoundryCommandService | null = null

  setFoundryCommandService(service: FoundryCommandService): void {
    this.foundryCommandService = service
  }

  async execute(
    config: ActionConfig | null,
    _instance: GamificationInstance,
    connectionId: string
  ): Promise<ResultData> {
    if (!this.foundryCommandService) {
      return { success: false, error: 'Service Foundry non disponible' }
    }

    const chatConfig = config?.chatMessage
    if (!chatConfig?.content) {
      return { success: false, error: 'Contenu du message manquant' }
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
}

export default ChatMessageAction
