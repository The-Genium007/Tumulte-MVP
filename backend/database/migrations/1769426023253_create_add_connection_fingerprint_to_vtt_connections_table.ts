import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'vtt_connections'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Connection fingerprint for security validation
      // Hash of worldId + initial moduleVersion, validated on token refresh
      table.string('connection_fingerprint', 64).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('connection_fingerprint')
    })
  }
}
