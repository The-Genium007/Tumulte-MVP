import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Add 'monster' value to the existing character_type_enum
    // PostgreSQL enums can be extended with ALTER TYPE ... ADD VALUE
    this.schema.raw(`ALTER TYPE character_type_enum ADD VALUE IF NOT EXISTS 'monster'`)
  }

  async down() {
    // Note: PostgreSQL does not support removing values from enums directly
    // To truly rollback, we would need to:
    // 1. Create a new enum without 'monster'
    // 2. Update the column to use the new enum
    // 3. Drop the old enum
    // For safety, we only log a warning here
    console.warn(
      'Cannot remove value from PostgreSQL enum. ' +
        'To rollback, manually recreate the enum without "monster" value.'
    )
  }
}
