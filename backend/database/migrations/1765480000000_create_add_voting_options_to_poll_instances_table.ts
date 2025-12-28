import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'poll_instances'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Type de vote: STANDARD (multiple) ou UNIQUE (simple)
      table.enum('type', ['STANDARD', 'UNIQUE']).notNullable().defaultTo('STANDARD')

      // Support des points de chaîne (uniquement pour API Twitch)
      table.boolean('channel_points_enabled').notNullable().defaultTo(false)
      table.integer('channel_points_amount').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('type')
      table.dropColumn('channel_points_enabled')
      table.dropColumn('channel_points_amount')
    })
  }
}
