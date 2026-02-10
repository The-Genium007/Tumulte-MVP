import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'poll_instances'

  async up() {
    // Knex enum() without useNative creates a CHECK constraint, not a PG enum type
    // Drop the old constraint and add a new one including CANCELLED
    this.schema.raw(
      `ALTER TABLE ${this.tableName} DROP CONSTRAINT IF EXISTS poll_instances_status_check`
    )
    this.schema.raw(
      `ALTER TABLE ${this.tableName} ADD CONSTRAINT poll_instances_status_check CHECK (status IN ('PENDING', 'RUNNING', 'ENDED', 'CANCELLED'))`
    )
  }

  async down() {
    // Revert CANCELLED rows to ENDED before re-applying the old constraint
    this.schema.raw(`UPDATE ${this.tableName} SET status = 'ENDED' WHERE status = 'CANCELLED'`)
    this.schema.raw(
      `ALTER TABLE ${this.tableName} DROP CONSTRAINT IF EXISTS poll_instances_status_check`
    )
    this.schema.raw(
      `ALTER TABLE ${this.tableName} ADD CONSTRAINT poll_instances_status_check CHECK (status IN ('PENDING', 'RUNNING', 'ENDED'))`
    )
  }
}
