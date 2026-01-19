import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Insert Foundry VTT provider data
    this.defer(async (db) => {
      await db.table('vtt_providers').insert({
        name: 'foundry',
        display_name: 'Foundry VTT',
        auth_type: 'api_key',
        is_active: true,
        config_schema: JSON.stringify({
          type: 'object',
          properties: {
            webhookUrl: { type: 'string', format: 'uri' },
          },
          required: [],
        }),
      })
    })
  }

  async down() {
    // Remove Foundry VTT provider
    this.defer(async (db) => {
      await db.from('vtt_providers').where('name', 'foundry').delete()
    })
  }
}
