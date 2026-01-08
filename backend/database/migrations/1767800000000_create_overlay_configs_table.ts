import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'overlay_configs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table
        .uuid('streamer_id')
        .notNullable()
        .references('id')
        .inTable('streamers')
        .onDelete('CASCADE')
      table.string('name', 255).notNullable()
      table.jsonb('config').notNullable().defaultTo('{}')
      table.boolean('is_active').notNullable().defaultTo(false)

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()

      // Index pour récupérer rapidement la config active d'un streamer
      table.index(['streamer_id', 'is_active'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
