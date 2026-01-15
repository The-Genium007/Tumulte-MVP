import { BaseCommand } from '@adonisjs/core/ace'
import { CommandOptions } from '@adonisjs/core/types/ace'
import VttProvider from '#models/vtt_provider'
import VttConnection from '#models/vtt_connection'
import { campaign as Campaign } from '#models/campaign'
import { randomBytes } from 'node:crypto'

export default class CreateTestVttConnection extends BaseCommand {
  static commandName = 'vtt:create-test'
  static description = 'Create a test VTT connection and campaign for development/testing'

  static options: CommandOptions = {
    startApp: true,
    allowUnknownFlags: false,
    staysAlive: false,
  }

  async run() {
    this.logger.info('Creating test VTT connection...')

    // Demander l'ID utilisateur
    const userId = await this.prompt.ask('Enter your User ID (UUID)', {
      validate: (value) => {
        // Validation basique UUID v4
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(value)) {
          return 'Please enter a valid UUID v4'
        }
        return true
      },
    })

    try {
      // Trouver le provider Foundry
      const foundryProvider = await VttProvider.query().where('name', 'foundry').first()

      if (!foundryProvider) {
        this.logger.error('Foundry VTT provider not found. Did you run the seeder?')
        this.logger.info('Run: node ace db:seed')
        return
      }

      // Générer une API key unique
      const apiKey = 'ta_test_' + randomBytes(16).toString('hex')

      // Créer la connexion
      const connection = await VttConnection.create({
        userId: userId,
        vttProviderId: foundryProvider.id,
        name: 'Test Foundry Connection',
        apiKey: apiKey,
        webhookUrl: 'http://localhost:3333/webhooks/vtt/dice-roll',
        status: 'active',
      })

      this.logger.success(`✅ VTT Connection created: ${connection.id}`)

      // Créer une campagne de test
      const campaign = await Campaign.create({
        name: 'Test VTT Campaign',
        description: "Campagne de test pour l'intégration VTT",
        ownerId: userId,
        vttConnectionId: connection.id,
        vttCampaignId: 'test-foundry-world',
        vttCampaignName: 'Test Foundry World',
      })

      this.logger.success(`✅ Campaign created: ${campaign.id}`)

      // Afficher le résumé
      this.logger.info(`
╔══════════════════════════════════════════════════════════════════╗
║  📋 Test VTT Connection Configuration                            ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  Connection ID:    ${connection.id.padEnd(36)}  ║
║  Campaign ID:      ${campaign.id.padEnd(36)}  ║
║                                                                  ║
║  VTT Campaign ID:  ${campaign.vttCampaignId?.padEnd(36) || 'N/A'.padEnd(36)}  ║
║  Webhook URL:      ${connection.webhookUrl.padEnd(36)}  ║
║                                                                  ║
║  🔑 API Key: ${apiKey}  ║
║                                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║  ⚠️  IMPORTANT: Save this API key, you'll need it for testing!   ║
╚══════════════════════════════════════════════════════════════════╝

🧪 Test the connection:

  curl -X POST http://localhost:3333/webhooks/vtt/test \\
    -H "Authorization: Bearer ${apiKey}"

📚 For more testing commands, see VTT_QUICK_START.md
      `)
    } catch (error) {
      this.logger.error('Failed to create test connection:')
      this.logger.error(error.message)

      if (error.code === 'E_ROW_NOT_FOUND') {
        this.logger.info('Make sure you have run the VTT provider seeder:')
        this.logger.info('node ace db:seed')
      }
    }
  }
}
