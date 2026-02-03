import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Migration: Add GM active character to campaigns
 *
 * This migration adds the ability for a Game Master to have an "active character"
 * they are currently incarnating. This is used for:
 * - Attributing dice rolls to the correct character when GM rolls
 * - Displaying which character the GM is playing in the UI
 *
 * SAFE MIGRATION:
 * - Adds a NULLABLE column with ON DELETE SET NULL
 * - No existing data is affected
 * - All campaigns will have gm_active_character_id = NULL by default
 */
export default class extends BaseSchema {
  protected tableName = 'campaigns'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Character currently incarnated by the GM
      // NULLABLE because:
      // 1. GM may not have selected any character
      // 2. Existing campaigns won't have a character selected
      table
        .uuid('gm_active_character_id')
        .nullable()
        .references('id')
        .inTable('characters')
        .onDelete('SET NULL') // If character is deleted, reset to NULL
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('gm_active_character_id')
    })
  }
}
