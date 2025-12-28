import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'poll_channel_links'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('poll_instance_id')
        .notNullable()
        .references('id')
        .inTable('poll_instances')
        .onDelete('CASCADE')
      table
        .uuid('streamer_id')
        .notNullable()
        .references('id')
        .inTable('streamers')
        .onDelete('CASCADE')
      table.string('twitch_poll_id').nullable()
      table
        .enum('status', ['CREATED', 'RUNNING', 'COMPLETED', 'TERMINATED'])
        .notNullable()
        .defaultTo('CREATED')
      table.integer('total_votes').notNullable().defaultTo(0)
      table.jsonb('votes_by_option').notNullable().defaultTo('{}')

      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
