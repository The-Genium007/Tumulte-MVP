import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Step 1: Add new columns to polls table (nullable initially)
    this.schema.alterTable('polls', (table) => {
      table.uuid('campaign_id').nullable().references('id').inTable('campaigns').onDelete('CASCADE')
      table.integer('duration_seconds').nullable()
      table.timestamp('last_launched_at', { useTz: true }).nullable()
    })

    // Step 2: Add poll_id to poll_instances (nullable, references poll template)
    this.schema.alterTable('poll_instances', (table) => {
      table.uuid('poll_id').nullable().references('id').inTable('polls').onDelete('SET NULL')
    })

    // Step 3: Migrate data from poll_sessions to polls
    // This uses raw SQL to copy campaign_id and duration from poll_sessions to polls
    this.defer(async (db) => {
      // Update polls with campaign_id from their associated poll_session
      await db.rawQuery(`
        UPDATE polls
        SET campaign_id = poll_sessions.campaign_id,
            duration_seconds = poll_sessions.default_duration_seconds
        FROM poll_sessions
        WHERE polls.session_id = poll_sessions.id
          AND poll_sessions.campaign_id IS NOT NULL
      `)

      // Set default duration for polls that couldn't get it from session
      await db.rawQuery(`
        UPDATE polls
        SET duration_seconds = 60
        WHERE duration_seconds IS NULL
      `)
    })

    // Step 4: Make campaign_id NOT NULL and duration_seconds NOT NULL on polls
    // Note: This is done in a separate alterTable to ensure data migration completes first
    this.defer(async (db) => {
      // First, delete any polls that don't have a campaign_id (orphaned polls)
      await db.rawQuery(`
        DELETE FROM polls WHERE campaign_id IS NULL
      `)

      // Then alter the columns to be NOT NULL
      await db.rawQuery(`
        ALTER TABLE polls
        ALTER COLUMN campaign_id SET NOT NULL,
        ALTER COLUMN duration_seconds SET NOT NULL,
        ALTER COLUMN duration_seconds SET DEFAULT 60
      `)
    })

    // Step 5: Drop session_id foreign key and column from polls
    this.schema.alterTable('polls', (table) => {
      table.dropForeign('session_id')
      table.dropColumn('session_id')
    })

    // Step 6: Drop poll_sessions table
    this.schema.dropTable('poll_sessions')
  }

  async down() {
    // Recreate poll_sessions table
    this.schema.createTable('poll_sessions', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('owner_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.uuid('campaign_id').nullable().references('id').inTable('campaigns').onDelete('CASCADE')
      table.string('name').notNullable()
      table.integer('default_duration_seconds').notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())
    })

    // Add session_id back to polls
    this.schema.alterTable('polls', (table) => {
      table
        .uuid('session_id')
        .nullable()
        .references('id')
        .inTable('poll_sessions')
        .onDelete('CASCADE')
    })

    // Remove poll_id from poll_instances
    this.schema.alterTable('poll_instances', (table) => {
      table.dropForeign('poll_id')
      table.dropColumn('poll_id')
    })

    // Remove new columns from polls
    this.schema.alterTable('polls', (table) => {
      table.dropForeign('campaign_id')
      table.dropColumn('campaign_id')
      table.dropColumn('duration_seconds')
      table.dropColumn('last_launched_at')
    })
  }
}
