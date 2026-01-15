import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'campaigns'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .uuid('vtt_connection_id')
        .nullable()
        .references('id')
        .inTable('vtt_connections')
        .onDelete('SET NULL')

      table.string('vtt_campaign_id', 255).nullable() // ID de la campagne dans le VTT
      table.string('vtt_campaign_name', 255).nullable() // Nom original dans le VTT
      table.jsonb('vtt_data').nullable() // Métadonnées du VTT

      table.timestamp('last_vtt_sync_at', { useTz: true }).nullable()

      // Index pour recherche par connexion VTT
      table.index('vtt_connection_id')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('vtt_connection_id')
      table.dropColumn('vtt_campaign_id')
      table.dropColumn('vtt_campaign_name')
      table.dropColumn('vtt_data')
      table.dropColumn('last_vtt_sync_at')
    })
  }
}
