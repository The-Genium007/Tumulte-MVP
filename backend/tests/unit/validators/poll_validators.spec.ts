import { test } from '@japa/runner'
import { launchPollSchema } from '#validators/polls/launch_poll_validator'
import { addPollSchema } from '#validators/polls/add_poll_validator'
import { createPollSessionSchema } from '#validators/polls/create_poll_session_validator'

test.group('LaunchPollValidator', () => {
  test('should accept valid poll launch data', ({ assert }) => {
    const validData = {
      title: 'What is your favorite color?',
      options: ['Red', 'Blue', 'Green'],
      durationSeconds: 60,
    }

    const result = launchPollSchema.safeParse(validData)

    assert.isTrue(result.success)
    if (result.success) {
      assert.equal(result.data.title, 'What is your favorite color?')
      assert.lengthOf(result.data.options, 3)
      assert.equal(result.data.durationSeconds, 60)
    }
  })

  test('should accept minimum options (2)', ({ assert }) => {
    const validData = {
      title: 'Question',
      options: ['Option 1', 'Option 2'],
    }

    const result = launchPollSchema.safeParse(validData)

    assert.isTrue(result.success)
  })

  test('should accept maximum options (5)', ({ assert }) => {
    const validData = {
      title: 'Question',
      options: ['A', 'B', 'C', 'D', 'E'],
    }

    const result = launchPollSchema.safeParse(validData)

    assert.isTrue(result.success)
  })

  test('should reject less than 2 options', ({ assert }) => {
    const invalidData = {
      title: 'Question',
      options: ['Only One'],
    }

    const result = launchPollSchema.safeParse(invalidData)

    assert.isFalse(result.success)
  })

  test('should reject more than 5 options', ({ assert }) => {
    const invalidData = {
      title: 'Question',
      options: ['A', 'B', 'C', 'D', 'E', 'F'],
    }

    const result = launchPollSchema.safeParse(invalidData)

    assert.isFalse(result.success)
  })

  test('should accept minimum duration (15 seconds)', ({ assert }) => {
    const validData = {
      title: 'Question',
      options: ['A', 'B'],
      durationSeconds: 15,
    }

    const result = launchPollSchema.safeParse(validData)

    assert.isTrue(result.success)
  })

  test('should accept maximum duration (1800 seconds / 30 minutes)', ({ assert }) => {
    const validData = {
      title: 'Question',
      options: ['A', 'B'],
      durationSeconds: 1800,
    }

    const result = launchPollSchema.safeParse(validData)

    assert.isTrue(result.success)
  })

  test('should reject duration less than 15 seconds', ({ assert }) => {
    const invalidData = {
      title: 'Question',
      options: ['A', 'B'],
      durationSeconds: 14,
    }

    const result = launchPollSchema.safeParse(invalidData)

    assert.isFalse(result.success)
  })

  test('should reject duration greater than 1800 seconds', ({ assert }) => {
    const invalidData = {
      title: 'Question',
      options: ['A', 'B'],
      durationSeconds: 1801,
    }

    const result = launchPollSchema.safeParse(invalidData)

    assert.isFalse(result.success)
  })

  test('should accept optional durationSeconds', ({ assert }) => {
    const validData = {
      title: 'Question',
      options: ['A', 'B'],
    }

    const result = launchPollSchema.safeParse(validData)

    assert.isTrue(result.success)
  })

  test('should accept valid UUID templateId', ({ assert }) => {
    const validData = {
      title: 'Question',
      options: ['A', 'B'],
      templateId: '550e8400-e29b-41d4-a716-446655440000',
    }

    const result = launchPollSchema.safeParse(validData)

    assert.isTrue(result.success)
  })

  test('should reject invalid UUID templateId', ({ assert }) => {
    const invalidData = {
      title: 'Question',
      options: ['A', 'B'],
      templateId: 'not-a-uuid',
    }

    const result = launchPollSchema.safeParse(invalidData)

    assert.isFalse(result.success)
  })

  test('should accept null templateId', ({ assert }) => {
    const validData = {
      title: 'Question',
      options: ['A', 'B'],
      templateId: null,
    }

    const result = launchPollSchema.safeParse(validData)

    assert.isTrue(result.success)
  })

  test('should accept maximum title length (60 chars)', ({ assert }) => {
    const validData = {
      title: 'A'.repeat(60),
      options: ['A', 'B'],
    }

    const result = launchPollSchema.safeParse(validData)

    assert.isTrue(result.success)
  })

  test('should reject title longer than 60 characters', ({ assert }) => {
    const invalidData = {
      title: 'A'.repeat(61),
      options: ['A', 'B'],
    }

    const result = launchPollSchema.safeParse(invalidData)

    assert.isFalse(result.success)
  })

  test('should reject empty title', ({ assert }) => {
    const invalidData = {
      title: '',
      options: ['A', 'B'],
    }

    const result = launchPollSchema.safeParse(invalidData)

    assert.isFalse(result.success)
  })

  test('should reject missing title', ({ assert }) => {
    const invalidData = {
      options: ['A', 'B'],
    }

    const result = launchPollSchema.safeParse(invalidData)

    assert.isFalse(result.success)
  })

  test('should reject missing options', ({ assert }) => {
    const invalidData = {
      title: 'Question',
    }

    const result = launchPollSchema.safeParse(invalidData)

    assert.isFalse(result.success)
  })

  test('should accept STANDARD poll with channel points enabled', ({ assert }) => {
    const validData = {
      title: 'Question with channel points',
      options: ['Option A', 'Option B'],
      type: 'STANDARD',
      channelPointsEnabled: true,
      channelPointsAmount: 50,
    }

    const result = launchPollSchema.safeParse(validData)

    assert.isTrue(result.success)
    if (result.success) {
      assert.equal(result.data.type, 'STANDARD')
      assert.isTrue(result.data.channelPointsEnabled)
      assert.equal(result.data.channelPointsAmount, 50)
    }
  })

  test('should accept UNIQUE poll without channel points', ({ assert }) => {
    const validData = {
      title: 'Simple unique vote',
      options: ['Yes', 'No'],
      type: 'UNIQUE',
    }

    const result = launchPollSchema.safeParse(validData)

    assert.isTrue(result.success)
    if (result.success) {
      assert.equal(result.data.type, 'UNIQUE')
      assert.isUndefined(result.data.channelPointsEnabled)
      assert.isUndefined(result.data.channelPointsAmount)
    }
  })
})

test.group('AddPollValidator', () => {
  test('should accept valid poll data', ({ assert }) => {
    const validData = {
      question: 'What is your favorite language?',
      options: ['JavaScript', 'TypeScript', 'Python'],
      type: 'STANDARD',
    }

    const result = addPollSchema.safeParse(validData)

    assert.isTrue(result.success)
    if (result.success) {
      assert.equal(result.data.question, 'What is your favorite language?')
      assert.equal(result.data.type, 'STANDARD')
    }
  })

  test('should accept UNIQUE type', ({ assert }) => {
    const validData = {
      question: 'Question',
      options: ['A', 'B'],
      type: 'UNIQUE',
    }

    const result = addPollSchema.safeParse(validData)

    assert.isTrue(result.success)
  })

  test('should default type to STANDARD if not provided', ({ assert }) => {
    const validData = {
      question: 'Question',
      options: ['A', 'B'],
    }

    const result = addPollSchema.safeParse(validData)

    assert.isTrue(result.success)
    if (result.success) {
      assert.equal(result.data.type, 'STANDARD')
    }
  })

  test('should reject invalid type', ({ assert }) => {
    const invalidData = {
      question: 'Question',
      options: ['A', 'B'],
      type: 'INVALID',
    }

    const result = addPollSchema.safeParse(invalidData)

    assert.isFalse(result.success)
  })

  test('should accept minimum options (2)', ({ assert }) => {
    const validData = {
      question: 'Question',
      options: ['Option 1', 'Option 2'],
    }

    const result = addPollSchema.safeParse(validData)

    assert.isTrue(result.success)
  })

  test('should accept maximum options (5)', ({ assert }) => {
    const validData = {
      question: 'Question',
      options: ['A', 'B', 'C', 'D', 'E'],
    }

    const result = addPollSchema.safeParse(validData)

    assert.isTrue(result.success)
  })

  test('should reject less than 2 options', ({ assert }) => {
    const invalidData = {
      question: 'Question',
      options: ['Only One'],
    }

    const result = addPollSchema.safeParse(invalidData)

    assert.isFalse(result.success)
  })

  test('should reject more than 5 options', ({ assert }) => {
    const invalidData = {
      question: 'Question',
      options: ['A', 'B', 'C', 'D', 'E', 'F'],
    }

    const result = addPollSchema.safeParse(invalidData)

    assert.isFalse(result.success)
  })

  test('should accept maximum option length (25 chars)', ({ assert }) => {
    const validData = {
      question: 'Question',
      options: ['A'.repeat(25), 'B'],
    }

    const result = addPollSchema.safeParse(validData)

    assert.isTrue(result.success)
  })

  test('should reject option longer than 25 characters', ({ assert }) => {
    const invalidData = {
      question: 'Question',
      options: ['A'.repeat(26), 'B'],
    }

    const result = addPollSchema.safeParse(invalidData)

    assert.isFalse(result.success)
  })

  test('should reject empty option string', ({ assert }) => {
    const invalidData = {
      question: 'Question',
      options: ['Valid Option', ''],
    }

    const result = addPollSchema.safeParse(invalidData)

    assert.isFalse(result.success)
  })

  test('should accept maximum question length (60 chars)', ({ assert }) => {
    const validData = {
      question: 'A'.repeat(60),
      options: ['A', 'B'],
    }

    const result = addPollSchema.safeParse(validData)

    assert.isTrue(result.success)
  })

  test('should reject question longer than 60 characters', ({ assert }) => {
    const invalidData = {
      question: 'A'.repeat(61),
      options: ['A', 'B'],
    }

    const result = addPollSchema.safeParse(invalidData)

    assert.isFalse(result.success)
  })

  test('should reject empty question', ({ assert }) => {
    const invalidData = {
      question: '',
      options: ['A', 'B'],
    }

    const result = addPollSchema.safeParse(invalidData)

    assert.isFalse(result.success)
  })

  test('should accept positive channel points per vote', ({ assert }) => {
    const validData = {
      question: 'Question',
      options: ['A', 'B'],
      channelPointsPerVote: 100,
    }

    const result = addPollSchema.safeParse(validData)

    assert.isTrue(result.success)
  })

  test('should reject zero channel points per vote', ({ assert }) => {
    const invalidData = {
      question: 'Question',
      options: ['A', 'B'],
      channelPointsPerVote: 0,
    }

    const result = addPollSchema.safeParse(invalidData)

    assert.isFalse(result.success)
  })

  test('should reject negative channel points per vote', ({ assert }) => {
    const invalidData = {
      question: 'Question',
      options: ['A', 'B'],
      channelPointsPerVote: -100,
    }

    const result = addPollSchema.safeParse(invalidData)

    assert.isFalse(result.success)
  })

  test('should accept null channel points per vote', ({ assert }) => {
    const validData = {
      question: 'Question',
      options: ['A', 'B'],
      channelPointsPerVote: null,
    }

    const result = addPollSchema.safeParse(validData)

    assert.isTrue(result.success)
  })
})

test.group('CreatePollSessionValidator', () => {
  test('should accept valid poll session data', ({ assert }) => {
    const validData = {
      name: 'Session Name',
      defaultDurationSeconds: 120,
    }

    const result = createPollSessionSchema.safeParse(validData)

    assert.isTrue(result.success)
    if (result.success) {
      assert.equal(result.data.name, 'Session Name')
      assert.equal(result.data.defaultDurationSeconds, 120)
    }
  })

  test('should accept minimum name length (3 chars)', ({ assert }) => {
    const validData = {
      name: 'ABC',
    }

    const result = createPollSessionSchema.safeParse(validData)

    assert.isTrue(result.success)
  })

  test('should reject name shorter than 3 characters', ({ assert }) => {
    const invalidData = {
      name: 'AB',
    }

    const result = createPollSessionSchema.safeParse(invalidData)

    assert.isFalse(result.success)
    if (!result.success) {
      assert.include(result.error.issues[0].message, 'au moins 3 caractères')
    }
  })

  test('should accept maximum name length (100 chars)', ({ assert }) => {
    const validData = {
      name: 'A'.repeat(100),
    }

    const result = createPollSessionSchema.safeParse(validData)

    assert.isTrue(result.success)
  })

  test('should reject name longer than 100 characters', ({ assert }) => {
    const invalidData = {
      name: 'A'.repeat(101),
    }

    const result = createPollSessionSchema.safeParse(invalidData)

    assert.isFalse(result.success)
  })

  test('should default duration to 60 seconds if not provided', ({ assert }) => {
    const validData = {
      name: 'Session',
    }

    const result = createPollSessionSchema.safeParse(validData)

    assert.isTrue(result.success)
    if (result.success) {
      assert.equal(result.data.defaultDurationSeconds, 60)
    }
  })

  test('should accept minimum duration (15 seconds)', ({ assert }) => {
    const validData = {
      name: 'Session',
      defaultDurationSeconds: 15,
    }

    const result = createPollSessionSchema.safeParse(validData)

    assert.isTrue(result.success)
  })

  test('should accept maximum duration (1800 seconds / 30 minutes)', ({ assert }) => {
    const validData = {
      name: 'Session',
      defaultDurationSeconds: 1800,
    }

    const result = createPollSessionSchema.safeParse(validData)

    assert.isTrue(result.success)
  })

  test('should reject duration less than 15 seconds', ({ assert }) => {
    const invalidData = {
      name: 'Session',
      defaultDurationSeconds: 14,
    }

    const result = createPollSessionSchema.safeParse(invalidData)

    assert.isFalse(result.success)
    if (!result.success) {
      assert.include(result.error.issues[0].message, 'Durée minimum: 15 secondes')
    }
  })

  test('should reject duration greater than 1800 seconds', ({ assert }) => {
    const invalidData = {
      name: 'Session',
      defaultDurationSeconds: 1801,
    }

    const result = createPollSessionSchema.safeParse(invalidData)

    assert.isFalse(result.success)
    if (!result.success) {
      assert.include(result.error.issues[0].message, 'Durée maximum: 30 minutes')
    }
  })

  test('should reject non-integer duration', ({ assert }) => {
    const invalidData = {
      name: 'Session',
      defaultDurationSeconds: 60.5,
    }

    const result = createPollSessionSchema.safeParse(invalidData)

    assert.isFalse(result.success)
  })

  test('should reject missing name', ({ assert }) => {
    const invalidData = {
      defaultDurationSeconds: 60,
    }

    const result = createPollSessionSchema.safeParse(invalidData)

    assert.isFalse(result.success)
  })
})
