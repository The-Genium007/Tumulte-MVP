import type { HttpContext } from '@adonisjs/core/http'
import { pollInstance as PollInstance } from '#models/poll_instance'
import { DateTime } from 'luxon'

export default class ActiveSessionController {
  /**
   * Récupérer la session active du MJ (s'il y en a une)
   * GET /mj/active-session
   */
  async show({ auth }: HttpContext) {
    const user = auth.user!

    // Chercher un poll RUNNING créé par cet utilisateur
    const runningPoll = await PollInstance.query()
      .where('createdBy', user.id)
      .where('status', 'RUNNING')
      .orderBy('started_at', 'desc')
      .first()

    if (!runningPoll) {
      return {
        data: {
          activeSession: null,
          currentPoll: null,
        },
      }
    }

    // Calculer le temps restant
    const startedAt = runningPoll.startedAt
    const durationSeconds = runningPoll.durationSeconds
    let remainingSeconds = 0

    if (startedAt) {
      const endsAt = startedAt.plus({ seconds: durationSeconds })
      const now = DateTime.now()
      remainingSeconds = Math.max(0, Math.round(endsAt.diff(now, 'seconds').seconds))
    }

    return {
      data: {
        // Note: Pour l'instant, on ne gère pas les sessions dans les polls
        // Cette fonctionnalité sera ajoutée plus tard
        activeSession: null,
        currentPoll: {
          id: runningPoll.id,
          title: runningPoll.title,
          options: runningPoll.options,
          durationSeconds: runningPoll.durationSeconds,
          status: runningPoll.status,
          startedAt: startedAt?.toISO(),
          remainingSeconds,
        },
      },
    }
  }
}
