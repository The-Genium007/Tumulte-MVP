import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'dice_rolls'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))

      table
        .uuid('campaign_id')
        .notNullable()
        .references('id')
        .inTable('campaigns')
        .onDelete('CASCADE')
      table
        .uuid('character_id')
        .notNullable()
        .references('id')
        .inTable('characters')
        .onDelete('CASCADE')

      table.string('vtt_roll_id', 255).nullable() // ID du lancer dans le VTT (pour déduplication)
      table.string('roll_formula', 100).notNullable() // "1d20+5", "2d6"
      table.integer('result').notNullable() // Résultat total
      table.specificType('dice_results', 'integer[]').notNullable() // [18, 5, 12]

      table.boolean('is_critical').notNullable().defaultTo(false)
      table
        .enum('critical_type', ['success', 'failure'], {
          useNative: true,
          enumName: 'critical_type_enum',
        })
        .nullable()

      table.boolean('is_hidden').notNullable().defaultTo(false) // Dé caché (MJ uniquement)
      table.string('roll_type', 50).nullable() // 'attack', 'skill_check', 'damage', etc.

      table.jsonb('vtt_data').nullable() // Données brutes du VTT

      table.timestamp('rolled_at', { useTz: true }).notNullable().defaultTo(this.now())

      // Index pour recherche rapide
      table.index('campaign_id')
      table.index('character_id')
      table.index(['campaign_id', 'is_critical'])
      table.index('vtt_roll_id') // Pour déduplication
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
    this.schema.raw('DROP TYPE IF EXISTS critical_type_enum')
  }
}
