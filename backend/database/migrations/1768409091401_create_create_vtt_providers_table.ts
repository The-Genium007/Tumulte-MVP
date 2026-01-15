import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'vtt_providers'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))

      table.string('name', 50).notNullable().unique() // 'foundry', 'roll20', 'alchemy'
      table.string('display_name', 100).notNullable() // 'Foundry VTT', 'Roll20', etc.
      table.string('auth_type', 20).notNullable() // 'api_key', 'oauth', etc.
      table.boolean('is_active').notNullable().defaultTo(true)
      table.jsonb('config_schema').nullable() // JSON schema for provider-specific config

      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
