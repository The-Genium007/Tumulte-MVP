import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { CampaignMembershipRepository } from '#repositories/campaign_membership_repository'
import { campaignMembership as CampaignMembership } from '#models/campaign_membership'
import { streamer as Streamer } from '#models/streamer'
import type {
  ReadinessIssue,
  StreamerReadinessDto,
  CampaignReadinessDto,
} from '#dtos/campaigns/streamer_readiness_dto'

/**
 * Service pour calculer l'état de readiness des streamers d'une campagne
 * Utilisé pour la waiting list avant le lancement de session
 */
@inject()
export class ReadinessService {
  constructor(private membershipRepository: CampaignMembershipRepository) {}

  /**
   * Récupère l'état de readiness de tous les streamers d'une campagne
   */
  async getCampaignReadiness(campaignId: string): Promise<CampaignReadinessDto> {
    logger.info({ campaignId }, 'Calculating campaign readiness')

    // Charger tous les membres ACTIVE avec leur streamer
    const memberships = await this.membershipRepository.findActiveByCampaign(campaignId)

    // Calculer la readiness pour chaque streamer
    const streamers: StreamerReadinessDto[] = []

    for (const membership of memberships) {
      const streamerReadiness = this.getStreamerReadiness(membership)
      streamers.push(streamerReadiness)
    }

    // Calculer les statistiques
    const readyStreamers = streamers.filter((s) => s.isReady)
    const readyCount = readyStreamers.length
    const totalCount = streamers.length
    const allReady = readyCount === totalCount && totalCount > 0

    logger.info(
      {
        campaignId,
        readyCount,
        totalCount,
        allReady,
      },
      'Campaign readiness calculated'
    )

    return {
      campaignId,
      allReady,
      readyCount,
      totalCount,
      streamers,
    }
  }

  /**
   * Calcule l'état de readiness d'un streamer individuel
   */
  getStreamerReadiness(membership: CampaignMembership): StreamerReadinessDto {
    const streamer = membership.streamer

    // Détecter les issues
    const issues = this.detectIssues(membership, streamer)

    // Un streamer est prêt s'il n'a aucune issue
    const isReady = issues.length === 0

    // Token est valide s'il n'est pas expiré et qu'il n'y a pas eu d'échec de refresh
    const tokenValid =
      !issues.includes('token_expired') &&
      !issues.includes('token_refresh_failed') &&
      !issues.includes('streamer_inactive')

    // Authorization est active si elle n'est pas manquante ou expirée
    const authorizationActive =
      !issues.includes('authorization_missing') && !issues.includes('authorization_expired')

    return {
      streamerId: streamer.id,
      streamerName: streamer.twitchDisplayName,
      streamerAvatar: streamer.profileImageUrl,
      twitchUserId: streamer.twitchUserId,
      userId: streamer.userId,
      isReady,
      issues,
      tokenValid,
      authorizationActive,
      authorizationExpiresAt: membership.pollAuthorizationExpiresAt?.toISO() ?? null,
    }
  }

  /**
   * Détecte les problèmes empêchant un streamer d'être prêt
   */
  private detectIssues(membership: CampaignMembership, streamer: Streamer): ReadinessIssue[] {
    const issues: ReadinessIssue[] = []

    // 1. Vérifier si le streamer est actif
    if (!streamer.isActive) {
      issues.push('streamer_inactive')
      return issues // Si inactif, pas besoin de vérifier le reste
    }

    // 2. Vérifier le token refresh failed (priorité sur expired)
    if (streamer.tokenRefreshFailedAt) {
      issues.push('token_refresh_failed')
    }
    // 3. Vérifier si le token est expiré
    else if (streamer.isTokenExpired) {
      issues.push('token_expired')
    }

    // 4. Vérifier l'authorization
    if (!membership.pollAuthorizationExpiresAt) {
      issues.push('authorization_missing')
    } else if (!membership.isPollAuthorizationActive) {
      issues.push('authorization_expired')
    }

    return issues
  }

  /**
   * Vérifie si un streamer spécifique est prêt
   */
  async isStreamerReady(campaignId: string, streamerId: string): Promise<boolean> {
    const membership = await this.membershipRepository.findByCampaignAndStreamer(
      campaignId,
      streamerId
    )

    if (!membership) {
      return false
    }

    // Charger le streamer si pas déjà chargé
    if (!membership.streamer) {
      await membership.load('streamer')
    }

    const readiness = this.getStreamerReadiness(membership)
    return readiness.isReady
  }
}

export default ReadinessService
export { ReadinessService as readinessService }
