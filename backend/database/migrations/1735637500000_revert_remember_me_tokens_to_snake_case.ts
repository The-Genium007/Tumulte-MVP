import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Remettre remember_me_tokens en snake_case car c'est une table système AdonisJS
    // qui ne supporte pas la naming strategy personnalisée
    this.schema.alterTable('remember_me_tokens', (table) => {
      table.renameColumn('tokenableId', 'tokenable_id')
      table.renameColumn('createdAt', 'created_at')
      table.renameColumn('updatedAt', 'updated_at')
      table.renameColumn('expiresAt', 'expires_at')
    })
  }

  async down() {
    // Rollback: remettre en camelCase
    this.schema.alterTable('remember_me_tokens', (table) => {
      table.renameColumn('tokenable_id', 'tokenableId')
      table.renameColumn('created_at', 'createdAt')
      table.renameColumn('updated_at', 'updatedAt')
      table.renameColumn('expires_at', 'expiresAt')
    })
  }
}
