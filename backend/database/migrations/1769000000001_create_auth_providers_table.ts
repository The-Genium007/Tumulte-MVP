import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'auth_providers'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))

      // Link to user
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')

      // Provider info
      table.enum('provider', ['google', 'twitch', 'microsoft', 'apple']).notNullable()
      table.string('provider_user_id', 255).notNullable() // ID from the provider
      table.string('provider_email', 255).nullable() // Email from the provider

      // OAuth tokens (encrypted)
      table.text('access_token_encrypted').nullable()
      table.text('refresh_token_encrypted').nullable()
      table.timestamp('token_expires_at', { useTz: true }).nullable()

      // Provider-specific data (JSON)
      table.jsonb('provider_data').nullable()

      // Timestamps
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())

      // Indexes
      table.unique(['provider', 'provider_user_id']) // One provider account = one entry
      table.index(['user_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
