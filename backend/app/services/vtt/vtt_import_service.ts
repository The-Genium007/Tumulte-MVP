import { DateTime } from 'luxon'
import { campaign as Campaign } from '#models/campaign'
import { user as User } from '#models/user'
import { campaignMembership as CampaignMembership } from '#models/campaign_membership'
import Character from '#models/character'

interface ImportCampaignData {
  userId: string
  vttConnectionId: string
  vttCampaignId: string
  name: string
  description?: string
  characters?: Array<{
    id: string
    name: string
    type: 'pc' | 'npc'
    avatarUrl: string | null
  }>
}

export default class VttImportService {
  /**
   * Importe une campagne depuis un VTT
   * Crée la campagne, ajoute le MJ comme membre, et importe les personnages (PJ)
   */
  async importCampaign(data: ImportCampaignData): Promise<Campaign> {
    // 1. Si nom vide, utiliser l'ID VTT comme nom
    const campaignName = data.name || data.vttCampaignId

    // 2. Créer la campagne avec lien VTT
    const campaign = await Campaign.create({
      ownerId: data.userId,
      name: campaignName,
      description: data.description || null,
      vttConnectionId: data.vttConnectionId,
      vttCampaignId: data.vttCampaignId,
      vttCampaignName: data.name, // Nom original du VTT
      lastVttSyncAt: DateTime.now(),
    })

    // 3. Ajouter le MJ comme membre ACTIVE (pattern existant)
    const owner = await User.query().where('id', data.userId).preload('streamer').firstOrFail()

    if (owner.streamer) {
      const membership = await CampaignMembership.create({
        campaignId: campaign.id,
        streamerId: owner.streamer.id,
        status: 'ACTIVE',
        invitedAt: DateTime.now(),
        acceptedAt: DateTime.now(),
        pollAuthorizationGrantedAt: DateTime.now(),
        pollAuthorizationExpiresAt: DateTime.now().plus({ years: 100 }),
      })

      await membership.load('streamer')
    }

    // 4. AUTOMATIQUE : Import des personnages (PJ seulement)
    if (data.characters && data.characters.length > 0) {
      const pcCharacters = data.characters.filter((c) => c.type === 'pc')

      for (const char of pcCharacters) {
        await Character.create({
          campaignId: campaign.id,
          vttCharacterId: char.id,
          name: char.name,
          avatarUrl: char.avatarUrl,
          characterType: 'pc',
          lastSyncAt: DateTime.now(),
        })
      }
    }

    return campaign
  }
}
