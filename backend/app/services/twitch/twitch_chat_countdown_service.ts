import logger from '@adonisjs/core/services/logger'
import TwitchChatService from './twitch_chat_service.js'

interface CountdownSchedule {
  pollInstanceId: string
  durationSeconds: number
  streamerIds: string[]
  timeouts: NodeJS.Timeout[]
}

/**
 * Service pour gérer les messages de countdown automatiques dans les polls chat
 */
export default class TwitchChatCountdownService {
  private schedules: Map<string, CountdownSchedule> = new Map()
  private chatService: TwitchChatService

  constructor(chatService: TwitchChatService) {
    this.chatService = chatService
  }

  /**
   * Planifie tous les messages de countdown pour un poll
   */
  scheduleCountdown(pollInstanceId: string, durationSeconds: number, streamerIds: string[]): void {
    const timeouts: NodeJS.Timeout[] = []

    // Message à 10 secondes
    if (durationSeconds >= 10) {
      const delay10s = (durationSeconds - 10) * 1000
      const timeout = setTimeout(async () => {
        await this.sendCountdownMessage(streamerIds, '⏰ Plus que 10 secondes pour voter !')
      }, delay10s)
      timeouts.push(timeout)
    }

    // Messages de 5 à 1
    for (let i = 5; i >= 1; i--) {
      if (durationSeconds >= i) {
        const delay = (durationSeconds - i) * 1000
        const timeout = setTimeout(async () => {
          await this.sendCountdownMessage(streamerIds, i.toString())
        }, delay)
        timeouts.push(timeout)
      }
    }

    // Message de clôture
    const delayEnd = durationSeconds * 1000
    const timeoutEnd = setTimeout(async () => {
      await this.sendCountdownMessage(streamerIds, '🔒 Sondage clôturé ! Merci pour vos votes 🎉')
    }, delayEnd)
    timeouts.push(timeoutEnd)

    // Stocker la schedule
    this.schedules.set(pollInstanceId, {
      pollInstanceId,
      durationSeconds,
      streamerIds,
      timeouts,
    })

    logger.info({
      event: 'countdown_scheduled',
      poll_instance_id: pollInstanceId,
      duration_seconds: durationSeconds,
      streamers_count: streamerIds.length,
      messages_count: timeouts.length,
    })
  }

  /**
   * Annule tous les countdowns pour un poll (en cas de cancellation)
   */
  cancelCountdown(pollInstanceId: string): void {
    const schedule = this.schedules.get(pollInstanceId)
    if (!schedule) {
      logger.warn({
        event: 'countdown_not_found',
        poll_instance_id: pollInstanceId,
      })
      return
    }

    // Annuler tous les timeouts
    schedule.timeouts.forEach((timeout) => clearTimeout(timeout))
    this.schedules.delete(pollInstanceId)

    logger.info({
      event: 'countdown_cancelled',
      poll_instance_id: pollInstanceId,
      timeouts_cleared: schedule.timeouts.length,
    })
  }

  /**
   * Envoie le message de countdown à tous les streamers
   */
  private async sendCountdownMessage(streamerIds: string[], message: string): Promise<void> {
    const results = await Promise.allSettled(
      streamerIds.map((streamerId) => this.chatService.sendMessage(streamerId, message))
    )

    const successCount = results.filter((r) => r.status === 'fulfilled').length
    const failureCount = results.filter((r) => r.status === 'rejected').length

    logger.debug({
      event: 'countdown_message_sent',
      message,
      streamers_count: streamerIds.length,
      success_count: successCount,
      failure_count: failureCount,
    })
  }
}
