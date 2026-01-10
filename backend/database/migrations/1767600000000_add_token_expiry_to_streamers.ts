import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'streamers'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.timestamp('token_expires_at', { useTz: true }).nullable()
      table.timestamp('last_token_refresh_at', { useTz: true }).nullable()
      table.timestamp('token_refresh_failed_at', { useTz: true }).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('token_expires_at')
      table.dropColumn('last_token_refresh_at')
      table.dropColumn('token_refresh_failed_at')
    })
  }
}
