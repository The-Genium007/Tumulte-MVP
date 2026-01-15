import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'vtt_connections'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // VTT World Information
      table.string('world_id').nullable()
      table.string('world_name').nullable()

      // Pairing & Secure Tunnel
      table.string('pairing_code').nullable().unique()
      table.text('encrypted_credentials').nullable()
      table
        .enum('tunnel_status', ['disconnected', 'connecting', 'connected', 'error'])
        .defaultTo('disconnected')

      // Connection Health
      table.timestamp('last_heartbeat_at').nullable()
      table.string('module_version').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('world_id')
      table.dropColumn('world_name')
      table.dropColumn('pairing_code')
      table.dropColumn('encrypted_credentials')
      table.dropColumn('tunnel_status')
      table.dropColumn('last_heartbeat_at')
      table.dropColumn('module_version')
    })
  }
}
