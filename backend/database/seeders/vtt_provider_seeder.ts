import { BaseSeeder } from '@adonisjs/lucid/seeders'
import VttProvider from '#models/vtt_provider'

export default class extends BaseSeeder {
  async run() {
    // Créer les 3 providers VTT
    await VttProvider.updateOrCreateMany('name', [
      {
        name: 'foundry',
        displayName: 'Foundry VTT',
        authType: 'api_key',
        isActive: true,
        configSchema: {
          type: 'object',
          properties: {
            webhookUrl: { type: 'string', format: 'uri' },
          },
          required: ['webhookUrl'],
        },
      },
      {
        name: 'roll20',
        displayName: 'Roll20',
        authType: 'api_key',
        isActive: true,
        configSchema: {
          type: 'object',
          properties: {
            webhookUrl: { type: 'string', format: 'uri' },
          },
          required: ['webhookUrl'],
        },
      },
      {
        name: 'alchemy',
        displayName: 'Alchemy RPG',
        authType: 'api_key',
        isActive: true,
        configSchema: {
          type: 'object',
          properties: {
            webhookUrl: { type: 'string', format: 'uri' },
          },
          required: ['webhookUrl'],
        },
      },
    ])
  }
}
