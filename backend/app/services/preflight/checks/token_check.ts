import logger from '@adonisjs/core/services/logger'
import { CampaignMembershipRepository } from '#repositories/campaign_membership_repository'
import { UserRepository } from '#repositories/user_repository'
import { TokenRefreshService } from '#services/auth/token_refresh_service'
import type { PreFlightCheck, CheckContext, CheckResult, EventCategory } from '../types.js'

interface InvalidStreamer {
  id: string
  displayName: string
  error: string
  issue?:
    | 'streamer_inactive'
    | 'authorization_missing'
    | 'authorization_expired'
    | 'token_invalid'
    | 'token_missing'
}

/**
 * TokenCheck - Validates streamer tokens for a campaign
 *
 * Priority 10 (authentication): Checks that all campaign streamers have
 * valid, non-expired tokens. Attempts auto-refresh on invalid tokens.
 *
 * Checks per streamer (in order):
 * 1. Streamer is active
 * 2. Poll authorization granted and not expired
 * 3. Access + refresh tokens present
 * 4. Token validates against Twitch OAuth endpoint
 * 5. Auto-refresh if invalid
 */
export class TokenCheck implements PreFlightCheck {
  name = 'tokens'
  appliesTo: EventCategory[] = ['all']
  priority = 10

  private campaignMembershipRepository = new CampaignMembershipRepository()
  private userRepository = new UserRepository()
  private tokenRefreshService = new TokenRefreshService()

  async execute(ctx: CheckContext): Promise<CheckResult> {
    const start = Date.now()

    try {
      const invalidStreamers = await this.checkTokens(ctx.campaignId, ctx.userId ?? null)

      if (invalidStreamers.length === 0) {
        logger.debug('[PreFlight] Token check: OK - All tokens valid')

        return {
          name: this.name,
          status: 'pass',
          message: 'All streamer tokens are valid',
          durationMs: Date.now() - start,
        }
      }

      logger.error({ invalidStreamers }, '[PreFlight] Token check: FAILED')

      return {
        name: this.name,
        status: 'fail',
        message: `${invalidStreamers.length} streamer(s) with invalid tokens`,
        details: invalidStreamers,
        remediation: invalidStreamers
          .map((s) => {
            switch (s.issue) {
              case 'streamer_inactive':
                return `${s.displayName}: compte streamer inactif`
              case 'authorization_missing':
                return `${s.displayName}: autorisation de sondage non accordée`
              case 'authorization_expired':
                return `${s.displayName}: autorisation de sondage expirée`
              case 'token_invalid':
                return `${s.displayName}: reconnexion Twitch nécessaire`
              case 'token_missing':
                return `${s.displayName}: tokens manquants`
              default:
                return `${s.displayName}: ${s.error}`
            }
          })
          .join(' | '),
        durationMs: Date.now() - start,
      }
    } catch (error) {
      logger.error({ error }, '[PreFlight] Token check: ERROR')

      return {
        name: this.name,
        status: 'fail',
        message: error instanceof Error ? error.message : 'Token validation failed',
        durationMs: Date.now() - start,
      }
    }
  }

  /**
   * Check all streamer tokens for a campaign.
   * Extracted from the original HealthCheckService.checkTokens().
   */
  private async checkTokens(campaignId: string, userId: string | null): Promise<InvalidStreamer[]> {
    const invalidStreamers: InvalidStreamer[] = []
    const checkedStreamerIds = new Set<string>()

    // 1. Check GM token first (if they have a streamer profile)
    // Skip if no userId (automatic/system triggers)
    if (!userId) {
      logger.debug('[PreFlight] No userId provided, skipping MJ token check')
    }
    try {
      const mjUser = userId ? await this.userRepository.findByIdWithStreamer(userId) : null
      if (mjUser?.streamer) {
        const streamer = mjUser.streamer
        checkedStreamerIds.add(streamer.id)

        try {
          const accessToken = await streamer.getDecryptedAccessToken()
          const refreshToken = await streamer.getDecryptedRefreshToken()

          if (!accessToken || !refreshToken) {
            invalidStreamers.push({
              id: streamer.id,
              displayName: streamer.twitchDisplayName,
              error: 'Missing access or refresh token',
            })
          } else {
            const response = await fetch('https://id.twitch.tv/oauth2/validate', {
              headers: { Authorization: `Bearer ${accessToken}` },
            })

            if (!response.ok) {
              logger.info(
                { streamerId: streamer.id, displayName: streamer.twitchDisplayName },
                '[PreFlight] MJ token invalid, attempting refresh...'
              )
              const refreshSuccess = await this.tokenRefreshService.refreshStreamerToken(streamer)
              if (!refreshSuccess) {
                invalidStreamers.push({
                  id: streamer.id,
                  displayName: streamer.twitchDisplayName,
                  error: 'Token expired or invalid (refresh failed)',
                })
              } else {
                logger.info(
                  { streamerId: streamer.id },
                  '[PreFlight] MJ token refreshed successfully'
                )
              }
            }
          }
        } catch (error) {
          invalidStreamers.push({
            id: streamer.id,
            displayName: streamer.twitchDisplayName,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }
    } catch (error) {
      logger.warn({ userId, error }, 'Failed to check MJ token')
    }

    // 2. Check all active campaign members
    const memberships = await this.campaignMembershipRepository.findActiveByCampaign(campaignId)

    for (const membership of memberships) {
      const streamer = membership.streamer
      if (!streamer) continue

      if (checkedStreamerIds.has(streamer.id)) {
        logger.debug(
          { streamerId: streamer.id, displayName: streamer.twitchDisplayName },
          'Skipping already checked streamer'
        )
        continue
      }

      checkedStreamerIds.add(streamer.id)

      if (!streamer.isActive) {
        invalidStreamers.push({
          id: streamer.id,
          displayName: streamer.twitchDisplayName,
          error: 'Streamer is inactive',
          issue: 'streamer_inactive',
        })
        continue
      }

      if (!membership.pollAuthorizationExpiresAt) {
        invalidStreamers.push({
          id: streamer.id,
          displayName: streamer.twitchDisplayName,
          error: 'No poll authorization granted',
          issue: 'authorization_missing',
        })
        continue
      }

      if (!membership.isPollAuthorizationActive) {
        invalidStreamers.push({
          id: streamer.id,
          displayName: streamer.twitchDisplayName,
          error: 'Poll authorization expired',
          issue: 'authorization_expired',
        })
        continue
      }

      try {
        const accessToken = await streamer.getDecryptedAccessToken()
        const refreshToken = await streamer.getDecryptedRefreshToken()

        if (!accessToken || !refreshToken) {
          invalidStreamers.push({
            id: streamer.id,
            displayName: streamer.twitchDisplayName,
            error: 'Missing access or refresh token',
            issue: 'token_missing',
          })
          continue
        }

        const response = await fetch('https://id.twitch.tv/oauth2/validate', {
          headers: { Authorization: `Bearer ${accessToken}` },
        })

        if (!response.ok) {
          logger.info(
            { streamerId: streamer.id, displayName: streamer.twitchDisplayName },
            '[PreFlight] Streamer token invalid, attempting refresh...'
          )
          const refreshSuccess = await this.tokenRefreshService.refreshStreamerToken(streamer)
          if (!refreshSuccess) {
            invalidStreamers.push({
              id: streamer.id,
              displayName: streamer.twitchDisplayName,
              error: 'Token expired or invalid (refresh failed)',
              issue: 'token_invalid',
            })
          } else {
            logger.info(
              { streamerId: streamer.id },
              '[PreFlight] Streamer token refreshed successfully'
            )
          }
        }
      } catch (error) {
        invalidStreamers.push({
          id: streamer.id,
          displayName: streamer.twitchDisplayName,
          error: error instanceof Error ? error.message : 'Unknown error',
          issue: 'token_invalid',
        })
      }
    }

    return invalidStreamers
  }
}

export default TokenCheck
