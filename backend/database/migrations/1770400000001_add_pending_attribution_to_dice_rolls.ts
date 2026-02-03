import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Migration: Add pending attribution fields to dice_rolls
 *
 * This migration enables GM dice rolls without a pre-selected character.
 * When a GM rolls without an active character, the roll is stored with:
 * - character_id = NULL (temporarily)
 * - pending_attribution = TRUE
 *
 * The GM can then attribute the roll to a character via the UI.
 *
 * SAFE MIGRATION:
 * - Makes character_id NULLABLE (existing data preserved with their values)
 * - Adds new columns with defaults (no data loss)
 * - Existing dice rolls are unaffected (pending_attribution = FALSE by default)
 */
export default class extends BaseSchema {
  protected tableName = 'dice_rolls'

  async up() {
    // Step 1: Make character_id nullable
    // PostgreSQL requires dropping and re-adding the constraint
    this.schema.alterTable(this.tableName, (table) => {
      // Drop the NOT NULL constraint by altering the column
      table.uuid('character_id').nullable().alter()
    })

    // Step 2: Add pending attribution tracking columns
    this.schema.alterTable(this.tableName, (table) => {
      // Flag indicating this roll needs character attribution
      table.boolean('pending_attribution').notNullable().defaultTo(false)

      // Index for quick lookup of pending rolls
      table.index(['campaign_id', 'pending_attribution'], 'idx_dice_rolls_pending')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      // Remove the index first
      table.dropIndex(['campaign_id', 'pending_attribution'], 'idx_dice_rolls_pending')

      // Remove the pending attribution column
      table.dropColumn('pending_attribution')
    })

    // Note: We intentionally do NOT restore NOT NULL on character_id
    // because there might now be rows with NULL values
    // If you need to restore NOT NULL, first update all NULL values to a valid character_id
  }
}
