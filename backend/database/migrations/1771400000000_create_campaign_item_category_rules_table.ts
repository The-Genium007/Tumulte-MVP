import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Migration: Create campaign_item_category_rules table
 *
 * Allows GMs to define which categories of items (spells, features, inventory)
 * are targetable by the spell gamification system (spell_disable, spell_buff, spell_debuff).
 *
 * SAFE MIGRATION:
 * - New table, no impact on existing data
 * - FK to campaigns with CASCADE delete
 */
export default class extends BaseSchema {
  protected tableName = 'campaign_item_category_rules'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))

      table
        .uuid('campaign_id')
        .notNullable()
        .references('id')
        .inTable('campaigns')
        .onDelete('CASCADE')

      // Category hierarchy
      table.string('category', 20).notNullable() // 'spell' | 'feature' | 'inventory'
      table.string('subcategory', 100).notNullable() // e.g. 'evocation', 'cantrip', 'weapon'

      // Foundry VTT item matching
      table.string('item_type', 50).notNullable() // Raw Foundry item type: 'spell', 'feat', 'weapon'
      table.string('match_field', 200).nullable() // Field path: 'system.school', 'system.type.value'
      table.string('match_value', 200).nullable() // Expected value: 'evo', 'cantrip'

      // Display
      table.string('label', 255).notNullable()
      table.text('description').nullable()
      table.string('icon', 100).nullable() // Lucide icon name
      table.string('color', 20).nullable() // Hex color

      // Gamification behavior
      table.boolean('is_targetable').notNullable().defaultTo(true)
      table.integer('weight').notNullable().defaultTo(1) // Random selection weight

      table.integer('priority').notNullable().defaultTo(0)
      table.boolean('is_enabled').notNullable().defaultTo(true)

      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())

      table.index(['campaign_id', 'category', 'is_enabled'], 'idx_campaign_item_cat_rules')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
