import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Password for email/password auth (nullable for OAuth-only users)
      table.string('password', 255).nullable()

      // Email verification
      table.timestamp('email_verified_at', { useTz: true }).nullable()
      table.string('email_verification_token', 64).nullable()
      table.timestamp('email_verification_sent_at', { useTz: true }).nullable()

      // Password reset
      table.string('password_reset_token', 64).nullable()
      table.timestamp('password_reset_sent_at', { useTz: true }).nullable()

      // User tier (free, premium, admin determined via .env)
      table.enum('tier', ['free', 'premium']).notNullable().defaultTo('free')

      // Avatar (can come from OAuth or be uploaded)
      table.string('avatar_url', 500).nullable()

      // Make email unique (will be required for new accounts)
      table.unique(['email'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropUnique(['email'])
      table.dropColumn('password')
      table.dropColumn('email_verified_at')
      table.dropColumn('email_verification_token')
      table.dropColumn('email_verification_sent_at')
      table.dropColumn('password_reset_token')
      table.dropColumn('password_reset_sent_at')
      table.dropColumn('tier')
      table.dropColumn('avatar_url')
    })
  }
}
