import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'poll_instances'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Résultats agrégés finaux (cumul de tous les streamers)
      table.integer('final_total_votes').nullable()
      table.jsonb('final_votes_by_option').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('final_total_votes')
      table.dropColumn('final_votes_by_option')
    })
  }
}
