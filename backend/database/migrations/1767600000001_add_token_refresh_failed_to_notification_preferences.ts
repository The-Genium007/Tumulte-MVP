import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'notification_preferences'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.boolean('token_refresh_failed').notNullable().defaultTo(true)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('token_refresh_failed')
    })
  }
}
