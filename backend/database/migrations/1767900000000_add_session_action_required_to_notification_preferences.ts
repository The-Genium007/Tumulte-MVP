import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'notification_preferences'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.boolean('session_action_required').notNullable().defaultTo(true)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('session_action_required')
    })
  }
}
