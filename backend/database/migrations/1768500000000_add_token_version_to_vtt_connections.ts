import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'vtt_connections'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Token version for instant token invalidation
      // Increment this to invalidate all existing session/refresh tokens
      table.integer('token_version').notNullable().defaultTo(1)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('token_version')
    })
  }
}
