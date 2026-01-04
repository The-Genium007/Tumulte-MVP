import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'notification_preferences'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table
        .uuid('user_id')
        .notNullable()
        .unique()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')

      // Global toggle
      table.boolean('push_enabled').notNullable().defaultTo(true)

      // Per-type toggles
      table.boolean('campaign_invitations').notNullable().defaultTo(true)
      table.boolean('critical_alerts').notNullable().defaultTo(true)
      table.boolean('poll_started').notNullable().defaultTo(true)
      table.boolean('poll_ended').notNullable().defaultTo(true)
      table.boolean('campaign_member_joined').notNullable().defaultTo(false)
      table.boolean('session_reminder').notNullable().defaultTo(false)

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
