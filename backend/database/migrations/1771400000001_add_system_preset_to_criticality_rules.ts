import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'campaign_criticality_rules'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.boolean('is_system_preset').notNullable().defaultTo(false)
      table.string('preset_key', 100).nullable().defaultTo(null)
    })

    // Partial unique index: prevent duplicate presets per campaign
    this.schema.raw(`
      CREATE UNIQUE INDEX idx_campaign_preset_key
      ON ${this.tableName}(campaign_id, preset_key)
      WHERE preset_key IS NOT NULL
    `)
  }

  async down() {
    this.schema.raw('DROP INDEX IF EXISTS idx_campaign_preset_key')

    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('preset_key')
      table.dropColumn('is_system_preset')
    })
  }
}
