import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Migration: Add criticality enrichment columns to dice_rolls
 *
 * Adds three NULLABLE columns to support enriched critical detection:
 * - severity: 'minor' | 'major' | 'extreme' (graduated severity)
 * - critical_label: Free-text label ("Natural 20", "Fumble", "Messy Critical")
 * - critical_category: Normalized category key for programmatic filtering
 *
 * SAFE MIGRATION:
 * - All columns are NULLABLE with no default → existing rows get NULL
 * - No modification to is_critical, critical_type, or critical_type_enum
 * - Fully additive, expand-contract pattern step 1
 */
export default class extends BaseSchema {
  protected tableName = 'dice_rolls'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('severity', 10).nullable()
      table.string('critical_label', 255).nullable()
      table.string('critical_category', 50).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('severity')
      table.dropColumn('critical_label')
      table.dropColumn('critical_category')
    })
  }
}
