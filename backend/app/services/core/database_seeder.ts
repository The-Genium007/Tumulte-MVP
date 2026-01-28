import logger from '@adonisjs/core/services/logger'
import VttProvider from '#models/vtt_provider'

/**
 * Service for ensuring required reference data exists in the database.
 * Runs at application startup to prevent "Row not found" errors
 * when migrations with deferred inserts fail silently.
 *
 * This is a safety net - the primary source of reference data
 * should still be migrations, but this ensures data integrity.
 */
export default class DatabaseSeeder {
  /**
   * Run all seeding tasks.
   * This is called after the application starts.
   */
  async seed(): Promise<void> {
    const startTime = Date.now()
    logger.info('[DatabaseSeeder] Checking reference data...')

    try {
      const results = await Promise.allSettled([this.seedVttProviders()])

      // Log results
      const taskNames = ['vttProviders']
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          logger.error(
            { error: result.reason },
            `[DatabaseSeeder] ${taskNames[index]} seeding failed`
          )
        }
      })

      const duration = Date.now() - startTime
      logger.info({ durationMs: duration }, '[DatabaseSeeder] Reference data check completed')
    } catch (error) {
      logger.error({ error }, '[DatabaseSeeder] Seeding failed')
    }
  }

  /**
   * Ensure VTT providers exist in the database.
   * Currently supports Foundry VTT, but designed to support more providers.
   */
  private async seedVttProviders(): Promise<number> {
    const providers = [
      {
        name: 'foundry',
        displayName: 'Foundry VTT',
        authType: 'api_key' as const,
        isActive: true,
        configSchema: {
          type: 'object',
          properties: {
            webhookUrl: { type: 'string', format: 'uri' },
          },
          required: [],
        },
      },
      // Add more providers here as needed:
      // {
      //   name: 'roll20',
      //   displayName: 'Roll20',
      //   authType: 'oauth' as const,
      //   isActive: false,
      //   configSchema: { ... },
      // },
    ]

    let seededCount = 0

    for (const providerData of providers) {
      try {
        // Use firstOrCreate to avoid duplicates
        const existingProvider = await VttProvider.query().where('name', providerData.name).first()

        if (!existingProvider) {
          await VttProvider.create({
            name: providerData.name,
            displayName: providerData.displayName,
            authType: providerData.authType,
            isActive: providerData.isActive,
            configSchema: providerData.configSchema,
          })
          logger.info({ provider: providerData.name }, '[DatabaseSeeder] Created VTT provider')
          seededCount++
        } else {
          logger.debug(
            { provider: providerData.name },
            '[DatabaseSeeder] VTT provider already exists'
          )
        }
      } catch (error) {
        logger.error(
          { provider: providerData.name, error },
          '[DatabaseSeeder] Failed to seed VTT provider'
        )
      }
    }

    if (seededCount > 0) {
      logger.info({ count: seededCount }, '[DatabaseSeeder] Seeded VTT providers')
    }

    return seededCount
  }
}
