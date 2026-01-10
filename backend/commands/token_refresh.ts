import { BaseCommand, args, flags } from '@adonisjs/core/ace'
import { CommandOptions } from '@adonisjs/core/types/ace'
import { streamer as Streamer } from '#models/streamer'
import { TokenRefreshService } from '#services/auth/token_refresh_service'

export default class TokenRefresh extends BaseCommand {
  static commandName = 'token:refresh'
  static description =
    'Manually trigger Twitch token refresh for streamers with active authorization'

  static options: CommandOptions = {
    startApp: true,
  }

  @args.string({ required: false, description: 'Specific streamer ID to refresh' })
  declare streamerId?: string

  @flags.boolean({ alias: 'f', description: 'Force refresh even if token is not expiring soon' })
  declare force: boolean

  @flags.boolean({ alias: 'd', description: 'Dry run - show what would be done without executing' })
  declare dryRun: boolean

  async run() {
    const tokenRefreshService = new TokenRefreshService()

    this.logger.info('🔄 Token Refresh Command')
    this.logger.info('========================\n')

    if (this.dryRun) {
      this.logger.warning('DRY RUN MODE - No changes will be made\n')
    }

    // Single streamer refresh
    if (this.streamerId) {
      await this.refreshSingleStreamer(tokenRefreshService, this.streamerId)
      return
    }

    // Refresh all streamers with active authorization
    await this.refreshAllStreamers(tokenRefreshService)
  }

  private async refreshSingleStreamer(
    service: TokenRefreshService,
    streamerId: string
  ): Promise<void> {
    const streamer = await Streamer.find(streamerId)

    if (!streamer) {
      this.logger.error(`❌ Streamer not found: ${streamerId}`)
      return
    }

    this.logger.info(`Streamer: ${streamer.twitchDisplayName} (${streamer.twitchLogin})`)
    this.logger.info(`Active: ${streamer.isActive}`)
    this.logger.info(`Token expires at: ${streamer.tokenExpiresAt?.toISO() || 'Unknown'}`)
    this.logger.info(`Token expiring soon: ${streamer.isTokenExpiringSoon}`)
    this.logger.info(`Last refresh: ${streamer.lastTokenRefreshAt?.toISO() || 'Never'}`)
    this.logger.info('')

    if (!this.force && !streamer.isTokenExpiringSoon) {
      this.logger.warning('Token is not expiring soon. Use --force to refresh anyway.')
      return
    }

    if (this.dryRun) {
      this.logger.info('Would refresh token for this streamer.')
      return
    }

    this.logger.info('Refreshing token...')
    const success = await service.refreshStreamerToken(streamer)

    if (success) {
      // Reload to get updated values
      await streamer.refresh()
      this.logger.success(`✅ Token refreshed successfully!`)
      this.logger.info(`New expiry: ${streamer.tokenExpiresAt?.toISO()}`)
    } else {
      this.logger.error(`❌ Token refresh failed`)
    }
  }

  private async refreshAllStreamers(service: TokenRefreshService): Promise<void> {
    this.logger.info('Finding streamers with active authorization...\n')

    const streamers = await service.findStreamersWithActiveAuthorization()

    if (streamers.length === 0) {
      this.logger.warning('No streamers with active authorization found.')
      return
    }

    this.logger.info(`Found ${streamers.length} streamer(s) with active authorization:\n`)

    for (const streamer of streamers) {
      const expiringSoon = streamer.isTokenExpiringSoon ? '⚠️  EXPIRING SOON' : '✓'
      this.logger.info(
        `  - ${streamer.twitchDisplayName} (${streamer.twitchLogin}) ${expiringSoon}`
      )
    }

    this.logger.info('')

    if (this.dryRun) {
      const toRefresh = this.force ? streamers : streamers.filter((s) => s.isTokenExpiringSoon)
      this.logger.info(`Would refresh ${toRefresh.length} token(s).`)
      return
    }

    this.logger.info('Starting refresh cycle...\n')

    const report = await service.refreshAllActiveTokens()

    this.logger.info('')
    this.logger.info('═══════════════════════════════════════')
    this.logger.info('              REPORT                   ')
    this.logger.info('═══════════════════════════════════════')
    this.logger.info(`Total streamers: ${report.total}`)
    this.logger.success(`Success: ${report.success}`)
    this.logger.error(`Failed: ${report.failed}`)
    this.logger.warning(`Skipped: ${report.skipped}`)
    this.logger.info('')

    if (report.details.length > 0) {
      this.logger.info('Details:')
      for (const detail of report.details) {
        const icon = detail.status === 'success' ? '✅' : detail.status === 'failed' ? '❌' : '⏭️'
        const reason = detail.reason ? ` (${detail.reason})` : ''
        this.logger.info(`  ${icon} ${detail.displayName}${reason}`)
      }
    }
  }
}
