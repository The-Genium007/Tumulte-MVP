import { DateTime } from 'luxon'
import GamificationInstance from '#models/gamification_instance'
import type { PreFlightCheck, CheckContext, CheckResult } from '../types.js'

/**
 * CooldownCheck - Validates that a gamification event is not on cooldown
 *
 * Priority: 20 (business rules layer)
 * AppliesTo: gamification only
 *
 * Requires ctx.metadata.eventId to identify which event to check.
 * Optionally uses ctx.metadata.streamerId for individual event cooldowns.
 */
export class CooldownCheck implements PreFlightCheck {
  name = 'cooldown'
  appliesTo: ['gamification'] = ['gamification']
  priority = 20

  async execute(ctx: CheckContext): Promise<CheckResult> {
    const start = Date.now()

    const eventId = ctx.metadata?.eventId as string | undefined
    if (!eventId) {
      // No specific event to check — skip gracefully
      return {
        name: this.name,
        status: 'pass',
        message: "Pas d'eventId fourni, vérification de cooldown ignorée",
        durationMs: Date.now() - start,
      }
    }

    try {
      const streamerId = ctx.metadata?.streamerId as string | undefined

      const query = GamificationInstance.query()
        .where('campaignId', ctx.campaignId)
        .where('eventId', eventId)
        .where('status', 'completed')
        .whereNotNull('cooldownEndsAt')
        .where('cooldownEndsAt', '>', DateTime.now().toSQL()!)
        .orderBy('cooldownEndsAt', 'desc')

      if (streamerId) {
        query.where('streamerId', streamerId)
      }

      const instance = await query.first()

      if (instance?.cooldownEndsAt) {
        const remainingSeconds = Math.ceil(
          instance.cooldownEndsAt.diff(DateTime.now(), 'seconds').seconds
        )

        return {
          name: this.name,
          status: 'fail',
          message: `Événement en cooldown (${remainingSeconds}s restantes)`,
          details: {
            eventId,
            cooldownEndsAt: instance.cooldownEndsAt.toISO(),
            remainingSeconds,
            instanceId: instance.id,
          },
          remediation: `Attendez ${remainingSeconds}s ou réinitialisez les cooldowns`,
          durationMs: Date.now() - start,
        }
      }

      return {
        name: this.name,
        status: 'pass',
        message: 'Pas de cooldown actif',
        durationMs: Date.now() - start,
      }
    } catch (error) {
      return {
        name: this.name,
        status: 'fail',
        message: `Erreur lors de la vérification du cooldown: ${error instanceof Error ? error.message : String(error)}`,
        durationMs: Date.now() - start,
      }
    }
  }
}

export default CooldownCheck
