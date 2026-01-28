import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'subscriptions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))

      // Link to user (one active subscription per user)
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')

      // Subscription tier
      table.enum('tier', ['free', 'premium']).notNullable().defaultTo('free')

      // Status
      table
        .enum('status', ['active', 'cancelled', 'expired', 'past_due', 'trialing'])
        .notNullable()
        .defaultTo('active')

      // Lemon Squeezy integration (ready for future)
      table.string('lemon_squeezy_subscription_id', 255).nullable()
      table.string('lemon_squeezy_customer_id', 255).nullable()
      table.string('lemon_squeezy_variant_id', 255).nullable()
      table.string('lemon_squeezy_product_id', 255).nullable()

      // Billing period
      table.timestamp('current_period_start', { useTz: true }).nullable()
      table.timestamp('current_period_end', { useTz: true }).nullable()
      table.timestamp('cancelled_at', { useTz: true }).nullable()
      table.timestamp('ends_at', { useTz: true }).nullable() // When subscription actually ends

      // Manual override (admin can grant premium)
      table.boolean('is_manual').notNullable().defaultTo(false)
      table
        .uuid('granted_by_user_id')
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.string('manual_reason', 500).nullable()

      // Timestamps
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())

      // Indexes
      table.index(['user_id'])
      table.index(['status'])
      table.index(['lemon_squeezy_subscription_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
