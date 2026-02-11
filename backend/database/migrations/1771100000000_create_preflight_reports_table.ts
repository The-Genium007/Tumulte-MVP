import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'preflight_reports'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('campaign_id')
        .nullable()
        .references('id')
        .inTable('campaigns')
        .onDelete('SET NULL')
      table.string('event_type', 20).notNullable()
      table.string('event_slug', 100).nullable()
      table.boolean('healthy').notNullable()
      table.boolean('has_warnings').notNullable().defaultTo(false)
      table.jsonb('checks').notNullable()
      table.uuid('triggered_by').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.string('mode', 10).notNullable().defaultTo('full')
      table.integer('duration_ms').notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())

      // Indexes for querying
      table.index(['campaign_id', 'created_at'], 'idx_preflight_reports_campaign_created')
      table.index(['created_at'], 'idx_preflight_reports_created')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
