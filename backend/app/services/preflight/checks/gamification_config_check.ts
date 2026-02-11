import CampaignGamificationConfig from '#models/campaign_gamification_config'
import type { PreFlightCheck, CheckContext, CheckResult } from '../types.js'

/**
 * GamificationConfigCheck - Validates that the gamification event is enabled for the campaign
 *
 * Priority: 20 (business rules layer)
 * AppliesTo: gamification only
 *
 * Requires ctx.metadata.eventId to identify which event to check.
 */
export class GamificationConfigCheck implements PreFlightCheck {
  name = 'gamification_config'
  appliesTo: ['gamification'] = ['gamification']
  priority = 20

  async execute(ctx: CheckContext): Promise<CheckResult> {
    const start = Date.now()

    const eventId = ctx.metadata?.eventId as string | undefined
    if (!eventId) {
      return {
        name: this.name,
        status: 'pass',
        message: "Pas d'eventId fourni, vérification de config ignorée",
        durationMs: Date.now() - start,
      }
    }

    try {
      const config = await CampaignGamificationConfig.query()
        .where('campaignId', ctx.campaignId)
        .where('eventId', eventId)
        .preload('event')
        .first()

      if (!config) {
        return {
          name: this.name,
          status: 'fail',
          message: 'Aucune configuration de gamification pour cet événement',
          details: { campaignId: ctx.campaignId, eventId },
          remediation: 'Activez cet événement dans les paramètres de gamification de la campagne',
          durationMs: Date.now() - start,
        }
      }

      if (!config.isEnabled) {
        return {
          name: this.name,
          status: 'fail',
          message: `Événement "${config.event?.name ?? eventId}" désactivé pour cette campagne`,
          details: { campaignId: ctx.campaignId, eventId, eventName: config.event?.name },
          remediation: "Activez l'événement dans les paramètres de gamification",
          durationMs: Date.now() - start,
        }
      }

      return {
        name: this.name,
        status: 'pass',
        message: `Événement "${config.event?.name ?? eventId}" activé`,
        durationMs: Date.now() - start,
      }
    } catch (error) {
      return {
        name: this.name,
        status: 'fail',
        message: `Erreur lors de la vérification de la config: ${error instanceof Error ? error.message : String(error)}`,
        durationMs: Date.now() - start,
      }
    }
  }
}

export default GamificationConfigCheck
