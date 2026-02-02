import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'gamification_instances'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Status d'exécution de l'action
      // null = pas encore complété, pending = en attente d'exécution, executed = exécuté, failed = échec
      table.enum('execution_status', ['pending', 'executed', 'failed']).nullable().defaultTo(null)

      // Date d'exécution de l'action
      table.timestamp('executed_at').nullable()

      // Index pour rechercher rapidement les instances en attente d'exécution
      table.index(['campaign_id', 'execution_status'], 'idx_instances_pending_execution')
      table.index(['streamer_id', 'execution_status'], 'idx_instances_streamer_pending')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['campaign_id', 'execution_status'], 'idx_instances_pending_execution')
      table.dropIndex(['streamer_id', 'execution_status'], 'idx_instances_streamer_pending')
      table.dropColumn('execution_status')
      table.dropColumn('executed_at')
    })
  }
}
