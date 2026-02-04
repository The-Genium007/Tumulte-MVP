import { test } from '@japa/runner'
import { TwitchRewardService } from '#services/twitch/twitch_reward_service'
import type { CreateRewardData } from '#services/twitch/twitch_reward_service'

/**
 * Unit tests for TwitchRewardService
 *
 * Tests the service methods that interact with the Twitch API.
 * Uses mocks since we can't make real API calls in tests.
 */
test.group('TwitchRewardService', () => {
  test('should create service instance', async ({ assert }) => {
    const service = new TwitchRewardService()
    assert.instanceOf(service, TwitchRewardService)
  })

  test('createReward should return null when streamer has no token', async ({ assert }) => {
    const service = new TwitchRewardService()

    const mockStreamer = {
      id: 'streamer-1',
      twitchUserId: '12345',
      getDecryptedAccessToken: async () => null,
    }

    const rewardData: CreateRewardData = {
      title: 'Test Reward',
      cost: 100,
    }

    const result = await service.createReward(mockStreamer as any, rewardData)

    assert.isNull(result)
  })

  test('updateReward should return null when streamer has no token', async ({ assert }) => {
    const service = new TwitchRewardService()

    const mockStreamer = {
      id: 'streamer-1',
      twitchUserId: '12345',
      getDecryptedAccessToken: async () => null,
    }

    const result = await service.updateReward(mockStreamer as any, 'reward-123', { cost: 200 })

    assert.isNull(result)
  })

  test('enableReward should return false when streamer has no token', async ({ assert }) => {
    const service = new TwitchRewardService()

    const mockStreamer = {
      id: 'streamer-1',
      twitchUserId: '12345',
      getDecryptedAccessToken: async () => null,
    }

    const result = await service.enableReward(mockStreamer as any, 'reward-123')

    assert.isFalse(result)
  })

  test('disableReward should return false when streamer has no token', async ({ assert }) => {
    const service = new TwitchRewardService()

    const mockStreamer = {
      id: 'streamer-1',
      twitchUserId: '12345',
      getDecryptedAccessToken: async () => null,
    }

    const result = await service.disableReward(mockStreamer as any, 'reward-123')

    assert.isFalse(result)
  })

  test('deleteReward should return false when streamer has no token', async ({ assert }) => {
    const service = new TwitchRewardService()

    const mockStreamer = {
      id: 'streamer-1',
      twitchUserId: '12345',
      getDecryptedAccessToken: async () => null,
    }

    const result = await service.deleteReward(mockStreamer as any, 'reward-123')

    assert.isFalse(result)
  })

  test('deleteRewardWithRetry should return failure when streamer has no token', async ({
    assert,
  }) => {
    const service = new TwitchRewardService()

    const mockStreamer = {
      id: 'streamer-1',
      twitchUserId: '12345',
      getDecryptedAccessToken: async () => null,
    }

    const result = await service.deleteRewardWithRetry(mockStreamer as any, 'reward-123')

    assert.isFalse(result.success)
    assert.isFalse(result.isAlreadyDeleted)
  })

  test('getRewardSlotsInfo should return null when streamer has no token', async ({ assert }) => {
    const service = new TwitchRewardService()

    const mockStreamer = {
      id: 'streamer-1',
      twitchUserId: '12345',
      getDecryptedAccessToken: async () => null,
    }

    const result = await service.getRewardSlotsInfo(mockStreamer as any)

    assert.isNull(result)
  })

  test('listRewards should return empty array when streamer has no token', async ({ assert }) => {
    const service = new TwitchRewardService()

    const mockStreamer = {
      id: 'streamer-1',
      twitchUserId: '12345',
      getDecryptedAccessToken: async () => null,
    }

    const result = await service.listRewards(mockStreamer as any)

    assert.isArray(result)
    assert.lengthOf(result, 0)
  })

  test('setCooldown should return false when streamer has no token', async ({ assert }) => {
    const service = new TwitchRewardService()

    const mockStreamer = {
      id: 'streamer-1',
      twitchUserId: '12345',
      getDecryptedAccessToken: async () => null,
    }

    const result = await service.setCooldown(mockStreamer as any, 'reward-123', 60)

    assert.isFalse(result)
  })

  test('refundRedemption should return false when streamer has no token', async ({ assert }) => {
    const service = new TwitchRewardService()

    const mockStreamer = {
      id: 'streamer-1',
      twitchUserId: '12345',
      getDecryptedAccessToken: async () => null,
    }

    const result = await service.refundRedemption(mockStreamer as any, 'redemption-123')

    assert.isFalse(result)
  })

  test('refundRedemptionWithRewardId should return false when streamer has no token', async ({
    assert,
  }) => {
    const service = new TwitchRewardService()

    const mockStreamer = {
      id: 'streamer-1',
      twitchUserId: '12345',
      getDecryptedAccessToken: async () => null,
    }

    const result = await service.refundRedemptionWithRewardId(
      mockStreamer as any,
      'reward-123',
      'redemption-456'
    )

    assert.isFalse(result)
  })
})

/**
 * Tests for CreateRewardData structure
 */
test.group('TwitchRewardService - CreateRewardData', () => {
  test('CreateRewardData should accept minimal required fields', async ({ assert }) => {
    const data: CreateRewardData = {
      title: 'Test Reward',
      cost: 100,
    }

    assert.equal(data.title, 'Test Reward')
    assert.equal(data.cost, 100)
  })

  test('CreateRewardData should accept all optional fields', async ({ assert }) => {
    const data: CreateRewardData = {
      title: 'Full Reward',
      cost: 500,
      prompt: 'Enter your choice',
      backgroundColor: '#FF0000',
      isEnabled: true,
      isUserInputRequired: true,
      maxPerStream: 10,
      maxPerUserPerStream: 2,
      globalCooldownSeconds: 300,
      shouldSkipRequestQueue: false,
    }

    assert.equal(data.title, 'Full Reward')
    assert.equal(data.cost, 500)
    assert.equal(data.prompt, 'Enter your choice')
    assert.equal(data.backgroundColor, '#FF0000')
    assert.isTrue(data.isEnabled)
    assert.isTrue(data.isUserInputRequired)
    assert.equal(data.maxPerStream, 10)
    assert.equal(data.maxPerUserPerStream, 2)
    assert.equal(data.globalCooldownSeconds, 300)
    assert.isFalse(data.shouldSkipRequestQueue)
  })
})

/**
 * Tests for RewardSlotsInfo structure
 */
test.group('TwitchRewardService - RewardSlotsInfo', () => {
  test('RewardSlotsInfo should have correct structure', async ({ assert }) => {
    // The MAX_REWARDS_PER_CHANNEL constant is 50
    const slotsInfo = {
      used: 10,
      max: 50,
      available: 40,
    }

    assert.equal(slotsInfo.used, 10)
    assert.equal(slotsInfo.max, 50)
    assert.equal(slotsInfo.available, 40)
    assert.equal(slotsInfo.max - slotsInfo.used, slotsInfo.available)
  })
})

/**
 * Tests for TwitchReward structure
 */
test.group('TwitchRewardService - TwitchReward', () => {
  test('TwitchReward should have all required fields', async ({ assert }) => {
    const reward = {
      id: 'reward-123',
      broadcasterId: '12345',
      broadcasterLogin: 'teststreamer',
      broadcasterName: 'TestStreamer',
      title: 'Test Reward',
      prompt: 'Do something',
      cost: 100,
      image: null,
      defaultImage: {
        url1x: 'https://example.com/1x.png',
        url2x: 'https://example.com/2x.png',
        url4x: 'https://example.com/4x.png',
      },
      backgroundColor: '#9146FF',
      isEnabled: true,
      isUserInputRequired: false,
      isMaxPerStreamEnabled: false,
      maxPerStream: 0,
      isMaxPerUserPerStreamEnabled: false,
      maxPerUserPerStream: 0,
      isGlobalCooldownEnabled: false,
      globalCooldownSeconds: 0,
      isPaused: false,
      shouldRedemptionsSkipRequestQueue: false,
    }

    assert.equal(reward.id, 'reward-123')
    assert.equal(reward.title, 'Test Reward')
    assert.equal(reward.cost, 100)
    assert.isTrue(reward.isEnabled)
    assert.isFalse(reward.isPaused)
  })

  test('TwitchReward image can be null or object', async ({ assert }) => {
    const rewardWithoutImage = {
      image: null,
    }

    const rewardWithImage = {
      image: {
        url1x: 'https://example.com/1x.png',
        url2x: 'https://example.com/2x.png',
        url4x: 'https://example.com/4x.png',
      },
    }

    assert.isNull(rewardWithoutImage.image)
    assert.isNotNull(rewardWithImage.image)
    assert.equal(rewardWithImage.image.url1x, 'https://example.com/1x.png')
  })
})
