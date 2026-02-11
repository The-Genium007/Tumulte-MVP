import { campaign as Campaign } from '#models/campaign'
import VttConnection from '#models/vtt_connection'
import type { PreFlightCheck, CheckContext, CheckResult, EventCategory } from '../types.js'

/**
 * VttConnectionCheck - Validates that the campaign has an active VTT connection
 *
 * Priority: 15 (connections layer — after infra + tokens, before business rules)
 * AppliesTo: gamification only (polls don't need VTT)
 */
export class VttConnectionCheck implements PreFlightCheck {
  name = 'vtt_connection'
  appliesTo: EventCategory[] = ['gamification']
  priority = 15

  async execute(ctx: CheckContext): Promise<CheckResult> {
    const start = Date.now()

    try {
      const campaign = await Campaign.find(ctx.campaignId)
      if (!campaign) {
        return {
          name: this.name,
          status: 'fail',
          message: 'Campagne introuvable',
          remediation: 'Vérifiez que la campagne existe',
          durationMs: Date.now() - start,
        }
      }

      if (!campaign.vttConnectionId) {
        return {
          name: this.name,
          status: 'fail',
          message: 'Aucune connexion VTT configurée pour cette campagne',
          remediation: 'Associez une connexion VTT à la campagne depuis les paramètres',
          durationMs: Date.now() - start,
        }
      }

      const connection = await VttConnection.find(campaign.vttConnectionId)
      if (!connection) {
        return {
          name: this.name,
          status: 'fail',
          message: 'Connexion VTT référencée mais introuvable en base',
          remediation: 'Recréez la connexion VTT depuis les paramètres de campagne',
          durationMs: Date.now() - start,
        }
      }

      if (connection.status !== 'active') {
        return {
          name: this.name,
          status: 'fail',
          message: `Connexion VTT en état "${connection.status}" (attendu: active)`,
          details: { connectionId: connection.id, status: connection.status },
          remediation: 'Réactivez la connexion VTT depuis Foundry',
          durationMs: Date.now() - start,
        }
      }

      // Check tunnel status for WebSocket-based connections
      if (connection.tunnelStatus === 'error' || connection.tunnelStatus === 'disconnected') {
        return {
          name: this.name,
          status: 'warn',
          message: `Tunnel VTT en état "${connection.tunnelStatus}"`,
          details: { connectionId: connection.id, tunnelStatus: connection.tunnelStatus },
          remediation: 'Vérifiez que le module Foundry est lancé et connecté',
          durationMs: Date.now() - start,
        }
      }

      return {
        name: this.name,
        status: 'pass',
        message: 'Connexion VTT active',
        durationMs: Date.now() - start,
      }
    } catch (error) {
      return {
        name: this.name,
        status: 'fail',
        message: `Erreur lors de la vérification VTT: ${error instanceof Error ? error.message : String(error)}`,
        durationMs: Date.now() - start,
      }
    }
  }
}

export default VttConnectionCheck
