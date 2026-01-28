import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'auth_providers'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('provider_display_name', 255).nullable().after('provider_email')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('provider_display_name')
    })
  }
}
