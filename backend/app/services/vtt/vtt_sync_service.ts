import VttConnection from '#models/vtt_connection'
import { campaign as Campaign } from '#models/campaign'
import { DateTime } from 'luxon'

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
   * Pour l'instant : utilise mock data
   * TODO: Intégrer le module VTT réel plus tard
   */
  async fetchCampaignsFromVtt(connection: VttConnection): Promise<VttCampaignData[]> {
    // MOCK DATA pour l'instant
    // Simuler des campagnes de test basées sur le provider
    const mockCampaigns: VttCampaignData[] = [
      {
        id: `${connection.vttProviderId}-campaign-1`,
        name: 'Les Mines de Phandelver',
        description: 'Campagne D&D 5e niveau 1-5',
        characterCount: 4,
        characters: [
          { id: 'char-1', name: 'Gandalf le Guerrier', type: 'pc', avatarUrl: null },
          { id: 'char-2', name: "Legolas l'Archer", type: 'pc', avatarUrl: null },
          { id: 'char-3', name: 'Gimli le Nain', type: 'pc', avatarUrl: null },
          { id: 'char-4', name: 'Aragorn le Rôdeur', type: 'pc', avatarUrl: null },
        ],
      },
      {
        id: `${connection.vttProviderId}-campaign-2`,
        name: 'Curse of Strahd',
        description: "Campagne d'horreur gothique",
        characterCount: 5,
        characters: [
          { id: 'char-5', name: 'Van Richten', type: 'pc', avatarUrl: null },
          { id: 'char-6', name: 'Ireena Kolyana', type: 'pc', avatarUrl: null },
          { id: 'char-7', name: 'Ezmeralda', type: 'pc', avatarUrl: null },
        ],
      },
      {
        id: `${connection.vttProviderId}-campaign-3`,
        name: 'Waterdeep: Dragon Heist',
        description: 'Intrigue urbaine à Waterdeep',
        characterCount: 3,
        characters: [
          { id: 'char-8', name: 'Renaer Neverember', type: 'pc', avatarUrl: null },
          { id: 'char-9', name: 'Floon Blagmaar', type: 'pc', avatarUrl: null },
        ],
      },
    ]

    // Simuler un délai réseau
    await new Promise((resolve) => setTimeout(resolve, 500))

    return mockCampaigns

    /* IMPLÉMENTATION RÉELLE (commentée pour l'instant)
    try {
      const response = await fetch(connection.webhookUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${connection.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'list-campaigns' }),
      })

      if (!response.ok) throw new Error('VTT sync failed')

      const data = await response.json()
      return data.campaigns || []
    } catch (error) {
      logger.error('Failed to sync campaigns from VTT', {
        connectionId: connection.id,
        error,
      })
      return []
    }
    */
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
      }

      syncedCampaigns.push(campaign)
    }

    return syncedCampaigns
  }
}
