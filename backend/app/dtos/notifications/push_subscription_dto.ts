import type PushSubscription from '#models/push_subscription'

export class PushSubscriptionDto {
  id!: string
  endpoint!: string
  deviceName!: string | null
  userAgent!: string | null
  createdAt!: string
  lastUsedAt!: string | null

  static fromModel(subscription: PushSubscription): PushSubscriptionDto {
    return {
      id: subscription.id,
      endpoint: subscription.endpoint,
      deviceName: subscription.deviceName,
      userAgent: subscription.userAgent,
      createdAt: subscription.createdAt.toISO() || '',
      lastUsedAt: subscription.lastUsedAt?.toISO() || null,
    }
  }

  static fromModelArray(subscriptions: PushSubscription[]): PushSubscriptionDto[] {
    return subscriptions.map((subscription) => PushSubscriptionDto.fromModel(subscription))
  }
}

export default PushSubscriptionDto
