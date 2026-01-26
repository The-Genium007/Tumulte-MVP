import VttConnection from '#models/vtt_connection'
import { campaign as Campaign } from '#models/campaign'
import { DateTime } from 'luxon'
import app from '@adonisjs/core/services/app'

export interface VttCampaignData {
  id: string
  name: string
  description?: string
  characterCount?: number
  characters?: Array<{
    id: string
    name: string
    type: 'pc' | 'npc'
    avatarUrl: string | null
  }>
}

export default class VttSyncService {
  /**
   * Récupère la liste des campagnes disponibles depuis un VTT
   *
   * Note: Cette méthode est prévue pour une future intégration où le VTT
   * pourrait exposer plusieurs campagnes/mondes. Actuellement, les campagnes
   * sont créées automatiquement lors du pairing via pairWithCode().
   *
   * @returns Tableau vide - les campagnes sont gérées via le flux de pairing
   */
  async fetchCampaignsFromVtt(_connection: VttConnection): Promise<VttCampaignData[]> {
    // Les campagnes sont maintenant créées automatiquement lors du pairing
    // Cette méthode est conservée pour une future intégration multi-mondes
    return []
  }

  /**
   * Synchronise les campagnes reçues via WebSocket depuis le VTT
   * Crée ou met à jour les campagnes en base de données
   */
  async syncCampaignsFromWebSocket(
    connection: VttConnection,
    campaigns: VttCampaignData[]
  ): Promise<Campaign[]> {
    const syncedCampaigns: Campaign[] = []

    for (const campaignData of campaigns) {
      // Chercher une campagne existante pour cette connexion VTT
      let campaign = await Campaign.query()
        .where('vtt_connection_id', connection.id)
        .where('vtt_campaign_id', campaignData.id)
        .first()

      if (campaign) {
        // Mettre à jour la campagne existante
        campaign.merge({
          name: campaignData.name,
          description: campaignData.description || campaign.description,
          vttCampaignName: campaignData.name,
          lastVttSyncAt: DateTime.now(),
        })
        await campaign.save()
      } else {
        // Créer une nouvelle campagne
        campaign = await Campaign.create({
          ownerId: connection.userId,
          vttConnectionId: connection.id,
          vttCampaignId: campaignData.id,
          vttCampaignName: campaignData.name,
          name: campaignData.name,
          description: campaignData.description || null,
          lastVttSyncAt: DateTime.now(),
        })

        // Ajouter le propriétaire comme membre avec autorisation permanente
        const campaignService = await app.container.make('campaignService')
        await campaignService.addOwnerAsMember(campaign.id, connection.userId)
      }

      syncedCampaigns.push(campaign)
    }

    return syncedCampaigns
  }
}
