import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'campaign_memberships'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.timestamp('poll_authorization_granted_at', { useTz: true }).nullable()
      table.timestamp('poll_authorization_expires_at', { useTz: true }).nullable()
      table.index(['campaign_id', 'poll_authorization_expires_at'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['campaign_id', 'poll_authorization_expires_at'])
      table.dropColumn('poll_authorization_granted_at')
      table.dropColumn('poll_authorization_expires_at')
    })
  }
}
