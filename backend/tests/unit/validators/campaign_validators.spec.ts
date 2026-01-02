import { test } from '@japa/runner'
import {
  createCampaignSchema,
  updateCampaignSchema,
} from '#validators/campaigns/create_campaign_validator'
import { inviteStreamerSchema } from '#validators/campaigns/invite_streamer_validator'

test.group('CreateCampaignValidator', () => {
  test('should accept valid campaign data', ({ assert }) => {
    const validData = {
      name: 'Valid Campaign',
      description: 'A valid description',
    }

    const result = createCampaignSchema.safeParse(validData)

    assert.isTrue(result.success)
    if (result.success) {
      assert.equal(result.data.name, 'Valid Campaign')
      assert.equal(result.data.description, 'A valid description')
    }
  })

  test('should accept minimum name length (3 chars)', ({ assert }) => {
    const validData = {
      name: 'ABC',
      description: 'Description',
    }

    const result = createCampaignSchema.safeParse(validData)

    assert.isTrue(result.success)
  })

  test('should reject name shorter than 3 characters', ({ assert }) => {
    const invalidData = {
      name: 'AB',
      description: 'Description',
    }

    const result = createCampaignSchema.safeParse(invalidData)

    assert.isFalse(result.success)
    if (!result.success) {
      assert.include(result.error.issues[0].message, 'au moins 3 caractères')
    }
  })

  test('should accept maximum name length (100 chars)', ({ assert }) => {
    const validData = {
      name: 'A'.repeat(100),
      description: 'Description',
    }

    const result = createCampaignSchema.safeParse(validData)

    assert.isTrue(result.success)
  })

  test('should reject name longer than 100 characters', ({ assert }) => {
    const invalidData = {
      name: 'A'.repeat(101),
      description: 'Description',
    }

    const result = createCampaignSchema.safeParse(invalidData)

    assert.isFalse(result.success)
    if (!result.success) {
      assert.include(result.error.issues[0].message, 'ne peut pas dépasser 100 caractères')
    }
  })

  test('should accept null description', ({ assert }) => {
    const validData = {
      name: 'Campaign',
      description: null,
    }

    const result = createCampaignSchema.safeParse(validData)

    assert.isTrue(result.success)
  })

  test('should accept missing description', ({ assert }) => {
    const validData = {
      name: 'Campaign',
    }

    const result = createCampaignSchema.safeParse(validData)

    assert.isTrue(result.success)
  })

  test('should accept maximum description length (500 chars)', ({ assert }) => {
    const validData = {
      name: 'Campaign',
      description: 'A'.repeat(500),
    }

    const result = createCampaignSchema.safeParse(validData)

    assert.isTrue(result.success)
  })

  test('should reject description longer than 500 characters', ({ assert }) => {
    const invalidData = {
      name: 'Campaign',
      description: 'A'.repeat(501),
    }

    const result = createCampaignSchema.safeParse(invalidData)

    assert.isFalse(result.success)
    if (!result.success) {
      assert.include(result.error.issues[0].message, 'ne peut pas dépasser 500 caractères')
    }
  })

  test('should reject missing name', ({ assert }) => {
    const invalidData = {
      description: 'Description',
    }

    const result = createCampaignSchema.safeParse(invalidData)

    assert.isFalse(result.success)
  })

  test('should reject empty string name', ({ assert }) => {
    const invalidData = {
      name: '',
      description: 'Description',
    }

    const result = createCampaignSchema.safeParse(invalidData)

    assert.isFalse(result.success)
  })
})

test.group('UpdateCampaignValidator', () => {
  test('should accept valid update data with name only', ({ assert }) => {
    const validData = {
      name: 'Updated Name',
    }

    const result = updateCampaignSchema.safeParse(validData)

    assert.isTrue(result.success)
  })

  test('should accept valid update data with description only', ({ assert }) => {
    const validData = {
      description: 'Updated description',
    }

    const result = updateCampaignSchema.safeParse(validData)

    assert.isTrue(result.success)
  })

  test('should accept empty update (all optional)', ({ assert }) => {
    const validData = {}

    const result = updateCampaignSchema.safeParse(validData)

    assert.isTrue(result.success)
  })

  test('should accept null description in update', ({ assert }) => {
    const validData = {
      description: null,
    }

    const result = updateCampaignSchema.safeParse(validData)

    assert.isTrue(result.success)
  })

  test('should reject name shorter than 3 characters in update', ({ assert }) => {
    const invalidData = {
      name: 'AB',
    }

    const result = updateCampaignSchema.safeParse(invalidData)

    assert.isFalse(result.success)
  })

  test('should reject description longer than 500 characters in update', ({ assert }) => {
    const invalidData = {
      description: 'A'.repeat(501),
    }

    const result = updateCampaignSchema.safeParse(invalidData)

    assert.isFalse(result.success)
  })
})

test.group('InviteStreamerValidator', () => {
  test('should accept valid Twitch user data', ({ assert }) => {
    const validData = {
      twitch_user_id: '12345',
      twitch_login: 'testuser',
      twitch_display_name: 'TestUser',
      profile_image_url: 'https://example.com/avatar.png',
    }

    const result = inviteStreamerSchema.safeParse(validData)

    assert.isTrue(result.success)
    if (result.success) {
      assert.equal(result.data.twitch_user_id, '12345')
      assert.equal(result.data.twitch_login, 'testuser')
      assert.equal(result.data.twitch_display_name, 'TestUser')
    }
  })

  test('should accept null profile_image_url', ({ assert }) => {
    const validData = {
      twitch_user_id: '12345',
      twitch_login: 'testuser',
      twitch_display_name: 'TestUser',
      profile_image_url: null,
    }

    const result = inviteStreamerSchema.safeParse(validData)

    assert.isTrue(result.success)
  })

  test('should accept missing profile_image_url', ({ assert }) => {
    const validData = {
      twitch_user_id: '12345',
      twitch_login: 'testuser',
      twitch_display_name: 'TestUser',
    }

    const result = inviteStreamerSchema.safeParse(validData)

    assert.isTrue(result.success)
  })

  test('should reject missing twitch_user_id', ({ assert }) => {
    const invalidData = {
      twitch_login: 'testuser',
      twitch_display_name: 'TestUser',
    }

    const result = inviteStreamerSchema.safeParse(invalidData)

    assert.isFalse(result.success)
  })

  test('should reject empty twitch_user_id', ({ assert }) => {
    const invalidData = {
      twitch_user_id: '',
      twitch_login: 'testuser',
      twitch_display_name: 'TestUser',
    }

    const result = inviteStreamerSchema.safeParse(invalidData)

    assert.isFalse(result.success)
  })

  test('should reject missing twitch_login', ({ assert }) => {
    const invalidData = {
      twitch_user_id: '12345',
      twitch_display_name: 'TestUser',
    }

    const result = inviteStreamerSchema.safeParse(invalidData)

    assert.isFalse(result.success)
  })

  test('should reject missing twitch_display_name', ({ assert }) => {
    const invalidData = {
      twitch_user_id: '12345',
      twitch_login: 'testuser',
    }

    const result = inviteStreamerSchema.safeParse(invalidData)

    assert.isFalse(result.success)
  })
})
