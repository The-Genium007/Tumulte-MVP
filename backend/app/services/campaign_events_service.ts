import { inject } from '@adonisjs/core'
import { PollInstanceRepository } from '#repositories/poll_instance_repository'
import { GamificationInstanceRepository } from '#repositories/gamification_instance_repository'
import { GamificationContributionRepository } from '#repositories/gamification_contribution_repository'
import { CampaignEventDto, type CampaignEventType } from '#dtos/campaign_events/campaign_event_dto'

/**
 * CampaignEventsService - Agrège tous les types d'événements d'une campagne
 *
 * Ce service unifie les différentes sources d'événements (sondages, gamification, etc.)
 * en un format commun pour l'affichage dans "Événements récents".
 *
 * Pour ajouter une nouvelle intégration Twitch :
 * 1. Créer le repository correspondant
 * 2. Ajouter le type dans CampaignEventType
 * 3. Implémenter la méthode de conversion dans CampaignEventDto
 * 4. Ajouter l'appel dans getEvents()
 */
@inject()
export class CampaignEventsService {
  constructor(
    private pollInstanceRepository: PollInstanceRepository,
    private gamificationInstanceRepository: GamificationInstanceRepository,
    private gamificationContributionRepository: GamificationContributionRepository
  ) {}

  /**
   * Récupère tous les événements d'une campagne triés par date
   *
   * @param campaignId - ID de la campagne
   * @param options - Options de filtrage et pagination
   */
  async getEvents(
    campaignId: string,
    options?: {
      limit?: number
      types?: CampaignEventType[]
      includeContributors?: boolean
    }
  ): Promise<CampaignEventDto[]> {
    const limit = options?.limit ?? 20
    const types = options?.types ?? ['poll', 'gamification_dice_reverse']
    const includeContributors = options?.includeContributors ?? true

    const events: CampaignEventDto[] = []

    // Récupérer les sondages terminés
    if (types.includes('poll')) {
      const pollEvents = await this.getPollEvents(campaignId, limit)
      events.push(...pollEvents)
    }

    // Récupérer les instances de gamification complétées
    if (types.includes('gamification_dice_reverse')) {
      const gamificationEvents = await this.getGamificationEvents(
        campaignId,
        limit,
        includeContributors
      )
      events.push(...gamificationEvents)
    }

    // Trier par date de complétion (plus récent en premier)
    events.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())

    // Limiter le nombre total
    return events.slice(0, limit)
  }

  /**
   * Récupère les événements de type sondage
   */
  private async getPollEvents(campaignId: string, limit: number): Promise<CampaignEventDto[]> {
    const polls = await this.pollInstanceRepository.findCompletedByCampaign(campaignId)

    // Limiter côté récupération pour les perfs
    const limitedPolls = polls.slice(0, limit)

    return limitedPolls.map((poll) =>
      CampaignEventDto.fromPollInstance(poll, {
        votesByOption: poll.finalVotesByOption || {},
        totalVotes: poll.finalTotalVotes || 0,
      })
    )
  }

  /**
   * Récupère les événements de gamification
   */
  private async getGamificationEvents(
    campaignId: string,
    limit: number,
    includeContributors: boolean
  ): Promise<CampaignEventDto[]> {
    // Récupérer uniquement les instances complétées (objectif atteint)
    const instances = await this.gamificationInstanceRepository.findByCampaign(campaignId, {
      status: 'completed',
      limit,
    })

    const events: CampaignEventDto[] = []

    for (const instance of instances) {
      let dto = CampaignEventDto.fromGamificationInstance(instance)

      // Ajouter les top contributeurs si demandé
      if (includeContributors) {
        const contributors = await this.gamificationContributionRepository.getTopContributors(
          instance.id,
          5
        )
        dto = CampaignEventDto.addTopContributors(
          dto,
          contributors.map((c) => ({
            twitchUsername: c.twitchUsername,
            amount: c.totalAmount,
          }))
        )
      }

      events.push(dto)
    }

    return events
  }

  /**
   * Récupère un événement par son ID unifié (format: "type_id")
   */
  async getEventById(eventId: string): Promise<CampaignEventDto | null> {
    const [type, id] = eventId.split('_', 2)

    if (!type || !id) {
      return null
    }

    if (type === 'poll') {
      const poll = await this.pollInstanceRepository.findById(id)
      if (!poll || (poll.status !== 'ENDED' && poll.status !== 'CANCELLED')) {
        return null
      }
      return CampaignEventDto.fromPollInstance(poll, {
        votesByOption: poll.finalVotesByOption || {},
        totalVotes: poll.finalTotalVotes || 0,
      })
    }

    if (type === 'gamification') {
      const instance = await this.gamificationInstanceRepository.findByIdWithRelations(id)
      if (!instance || instance.status !== 'completed') {
        return null
      }
      let dto = CampaignEventDto.fromGamificationInstance(instance)

      // Ajouter les contributeurs
      const contributors = await this.gamificationContributionRepository.getTopContributors(id, 10)
      dto = CampaignEventDto.addTopContributors(
        dto,
        contributors.map((c) => ({
          twitchUsername: c.twitchUsername,
          amount: c.totalAmount,
        }))
      )

      return dto
    }

    return null
  }
}

export default CampaignEventsService
