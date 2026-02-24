import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Migration: Create campaign_criticality_rules table
 *
 * Allows GMs to define custom criticality detection rules for their campaigns.
 * This enables support for homebrew systems and custom thresholds.
 *
 * SAFE MIGRATION:
 * - New table, no impact on existing data
 * - FK to campaigns with CASCADE delete
 */
export default class extends BaseSchema {
  protected tableName = 'campaign_criticality_rules'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))

      table
        .uuid('campaign_id')
        .notNullable()
        .references('id')
        .inTable('campaigns')
        .onDelete('CASCADE')

      table.string('dice_formula', 50).nullable() // "d20", "d100", "2d6", "*" (any)
      table.string('result_condition', 100).notNullable() // "== 20", "<= 1", ">= 96", "doubles"
      table.string('result_field', 20).notNullable().defaultTo('max_die') // 'max_die' | 'min_die' | 'total' | 'any_die'

      table.string('critical_type', 10).notNullable() // 'success' | 'failure'
      table.string('severity', 10).notNullable().defaultTo('major') // 'minor' | 'major' | 'extreme'
      table.string('label', 255).notNullable() // Free-text: "Fumble cosmique", "Bénédiction divine"
      table.text('description').nullable() // Optional explanation

      table.integer('priority').notNullable().defaultTo(0) // Higher = evaluated first
      table.boolean('is_enabled').notNullable().defaultTo(true)

      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())

      table.index(['campaign_id', 'is_enabled'], 'idx_campaign_crit_rules')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
