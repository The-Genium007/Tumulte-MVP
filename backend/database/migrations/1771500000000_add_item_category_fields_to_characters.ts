import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'characters'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.jsonb('item_category_summary').nullable()
      table.string('item_category_hash', 64).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('item_category_summary')
      table.dropColumn('item_category_hash')
    })
  }
}
