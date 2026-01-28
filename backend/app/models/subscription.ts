import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'

export type SubscriptionTier = 'free' | 'premium'
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'past_due' | 'trialing'

/**
 * Subscription model - tracks user subscription status
 *
 * Ready for Lemon Squeezy integration but works with manual assignment too.
 * Admins can grant premium status manually with a reason.
 */
class Subscription extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare tier: SubscriptionTier

  @column()
  declare status: SubscriptionStatus

  // Lemon Squeezy fields (for future integration)
  @column()
  declare lemonSqueezySubscriptionId: string | null

  @column()
  declare lemonSqueezyCustomerId: string | null

  @column()
  declare lemonSqueezyVariantId: string | null

  @column()
  declare lemonSqueezyProductId: string | null

  // Billing period
  @column.dateTime()
  declare currentPeriodStart: DateTime | null

  @column.dateTime()
  declare currentPeriodEnd: DateTime | null

  @column.dateTime()
  declare cancelledAt: DateTime | null

  @column.dateTime()
  declare endsAt: DateTime | null

  // Manual override
  @column()
  declare isManual: boolean

  @column()
  declare grantedByUserId: string | null

  @column()
  declare manualReason: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relations
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'grantedByUserId' })
  declare grantedBy: BelongsTo<typeof User>

  /**
   * Check if subscription is currently active
   */
  get isActive(): boolean {
    if (this.status !== 'active' && this.status !== 'trialing') {
      return false
    }
    // If there's an end date and it's passed, not active
    if (this.endsAt && this.endsAt < DateTime.now()) {
      return false
    }
    return true
  }

  /**
   * Check if subscription is premium (and active)
   */
  get isPremium(): boolean {
    return this.tier === 'premium' && this.isActive
  }

  /**
   * Create a manual premium subscription (granted by admin)
   */
  static async grantPremium(
    userId: string,
    grantedByUserId: string,
    reason?: string,
    endsAt?: DateTime
  ): Promise<Subscription> {
    // Deactivate any existing subscription
    await Subscription.query().where('user_id', userId).update({ status: 'expired' })

    const subscription = new Subscription()
    subscription.userId = userId
    subscription.tier = 'premium'
    subscription.status = 'active'
    subscription.isManual = true
    subscription.grantedByUserId = grantedByUserId
    subscription.manualReason = reason ?? null
    subscription.currentPeriodStart = DateTime.now()
    subscription.endsAt = endsAt ?? null

    await subscription.save()
    return subscription
  }

  /**
   * Revoke premium subscription
   */
  async revoke(): Promise<void> {
    this.status = 'cancelled'
    this.cancelledAt = DateTime.now()
    this.endsAt = DateTime.now()
    await this.save()
  }
}

export { Subscription as subscription }
export default Subscription
