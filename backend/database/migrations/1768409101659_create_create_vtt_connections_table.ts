import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'vtt_connections'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))

      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table
        .uuid('vtt_provider_id')
        .notNullable()
        .references('id')
        .inTable('vtt_providers')
        .onDelete('RESTRICT')

      table.string('name', 100).notNullable() // Nom donné par le MJ
      table.text('api_key').notNullable().unique() // API key générée par Tumulte
      table.string('webhook_url', 255).notNullable() // URL webhook Tumulte
      table
        .enum('status', ['pending', 'active', 'expired', 'revoked'], {
          useNative: true,
          enumName: 'vtt_connection_status',
        })
        .notNullable()
        .defaultTo('pending')

      table.timestamp('last_webhook_at', { useTz: true }).nullable()

      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())

      // Index pour recherche rapide par API key
      table.index('api_key')
      table.index('user_id')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
    this.schema.raw('DROP TYPE IF EXISTS vtt_connection_status')
  }
}
