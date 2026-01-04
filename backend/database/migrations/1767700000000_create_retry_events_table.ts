import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'retry_events'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))

      // Context information
      table.string('service', 100).notNullable()
      table.string('operation', 200).notNullable()

      // Attempt details
      table.integer('attempts').notNullable()
      table.boolean('success').notNullable()
      table.integer('total_duration_ms').notNullable()
      table.integer('final_status_code').nullable()
      table.text('error_message').nullable()

      // Circuit breaker info
      table.boolean('circuit_breaker_triggered').defaultTo(false)
      table.string('circuit_breaker_key', 100).nullable()

      // Additional context as JSON
      table.jsonb('metadata').nullable()

      // Optional foreign keys for traceability
      table
        .uuid('streamer_id')
        .nullable()
        .references('id')
        .inTable('streamers')
        .onDelete('SET NULL')
      table
        .uuid('campaign_id')
        .nullable()
        .references('id')
        .inTable('campaigns')
        .onDelete('SET NULL')
      table
        .uuid('poll_instance_id')
        .nullable()
        .references('id')
        .inTable('poll_instances')
        .onDelete('SET NULL')

      // Timestamp
      table.timestamp('created_at', { useTz: true }).defaultTo(this.now())
    })

    // Index for querying by service and success status
    this.schema.raw(`
      CREATE INDEX idx_retry_events_service_success
      ON ${this.tableName} (service, success, created_at DESC)
    `)

    // Index for recent events
    this.schema.raw(`
      CREATE INDEX idx_retry_events_created_at
      ON ${this.tableName} (created_at DESC)
    `)

    // Index for circuit breaker analysis
    this.schema.raw(`
      CREATE INDEX idx_retry_events_circuit_breaker
      ON ${this.tableName} (circuit_breaker_key, created_at DESC)
      WHERE circuit_breaker_key IS NOT NULL
    `)
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
