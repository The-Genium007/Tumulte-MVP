import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  // ALTER TYPE ... ADD VALUE cannot run inside a transaction
  protected disableTransactions = true

  async up() {
    const enumValues = ['spell_disable', 'spell_buff', 'spell_debuff']
    for (const value of enumValues) {
      const exists = await this.db.rawQuery(
        `SELECT 1 FROM pg_enum WHERE enumlabel = ? AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'gamification_action_type_enum')`,
        [value]
      )
      if (exists.rows.length === 0) {
        await this.db.rawQuery(`ALTER TYPE gamification_action_type_enum ADD VALUE '${value}'`)
      }
    }
  }

  async down() {
    // PostgreSQL does not support removing enum values directly.
    // The values are harmless if left in place after rollback.
  }
}
