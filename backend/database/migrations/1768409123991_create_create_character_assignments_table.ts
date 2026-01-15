import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'character_assignments'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))

      table
        .uuid('character_id')
        .notNullable()
        .references('id')
        .inTable('characters')
        .onDelete('CASCADE')
      table
        .uuid('streamer_id')
        .notNullable()
        .references('id')
        .inTable('streamers')
        .onDelete('CASCADE')
      table
        .uuid('campaign_id')
        .notNullable()
        .references('id')
        .inTable('campaigns')
        .onDelete('CASCADE')

      table.timestamp('assigned_at', { useTz: true }).notNullable().defaultTo(this.now())

      // Un personnage ne peut être assigné qu'à un seul streamer par campagne
      table.unique(['character_id', 'campaign_id'])
      table.index('streamer_id')
      table.index('campaign_id')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
