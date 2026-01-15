import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'token_revocation_lists'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      // Token identifier (jti claim from JWT)
      table.string('jti').notNullable().unique()

      // Token type (session, refresh, pairing)
      table.enum('token_type', ['session', 'refresh', 'pairing']).notNullable()

      // VTT Connection reference (nullable for revoked tokens)
      table.uuid('vtt_connection_id').nullable()
      table
        .foreign('vtt_connection_id')
        .references('id')
        .inTable('vtt_connections')
        .onDelete('CASCADE')

      // Revocation info
      table.timestamp('revoked_at').notNullable()
      table.string('revoked_reason').nullable()

      // Token expiry (for cleanup)
      table.timestamp('expires_at').notNullable()

      table.timestamp('created_at')
    })

    // Index for fast lookup
    this.schema.raw('CREATE INDEX idx_token_revocation_jti ON token_revocation_lists(jti)')
    this.schema.raw(
      'CREATE INDEX idx_token_revocation_expires ON token_revocation_lists(expires_at)'
    )
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
