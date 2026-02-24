import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'gamification_contributions'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.timestamp('refunded_at', { useTz: true }).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('refunded_at')
    })
  }
}
