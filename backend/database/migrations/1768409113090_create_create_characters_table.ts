import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'characters'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))

      table
        .uuid('campaign_id')
        .notNullable()
        .references('id')
        .inTable('campaigns')
        .onDelete('CASCADE')

      table.string('vtt_character_id', 255).notNullable() // ID du personnage dans le VTT
      table.string('name', 100).notNullable()
      table.string('avatar_url', 500).nullable()
      table
        .enum('character_type', ['pc', 'npc'], {
          useNative: true,
          enumName: 'character_type_enum',
        })
        .notNullable()
        .defaultTo('pc')

      table.jsonb('stats').nullable() // { strength: 18, dexterity: 14, ... }
      table.jsonb('inventory').nullable() // [{ name: 'Sword', quantity: 1 }, ...]
      table.jsonb('vtt_data').nullable() // Données brutes du VTT

      table.timestamp('last_sync_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())

      // Un personnage VTT unique par campagne
      table.unique(['campaign_id', 'vtt_character_id'])
      table.index('campaign_id')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
    this.schema.raw('DROP TYPE IF EXISTS character_type_enum')
  }
}
