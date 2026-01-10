import { test } from '@japa/runner'
import testUtils from '#tests/helpers/database'
import { createTestUser, createTestStreamer } from '#tests/helpers/test_utils'
import { BackendLogService } from '#services/support/backend_log_service'

/**
 * Tests for BackendLogService with database integration
 * Tests the service methods that interact with Redis
 */
test.group('BackendLogService - Integration', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('getUserLogs should return empty array for new user', async ({ assert }) => {
    const user = await createTestUser({})
    const service = new BackendLogService()

    const logs = await service.getUserLogs(user.id.toString())

    assert.isArray(logs)
    assert.lengthOf(logs, 0)
  })

  test('pushLog should store log entry for user', async ({ assert }) => {
    const user = await createTestUser({})
    const service = new BackendLogService()

    const logEntry = BackendLogService.createLogEntry({
      requestId: 'test-req-1',
      method: 'GET',
      url: '/api/campaigns',
      statusCode: 200,
      durationMs: 50,
    })

    await service.pushLog(user.id.toString(), logEntry)

    const logs = await service.getUserLogs(user.id.toString())

    assert.isArray(logs)
    assert.lengthOf(logs, 1)
    assert.equal(logs[0].requestId, 'test-req-1')
    assert.equal(logs[0].method, 'GET')
    assert.equal(logs[0].url, '/api/campaigns')
    assert.equal(logs[0].statusCode, 200)
  })

  test('logs should be returned in reverse chronological order', async ({ assert }) => {
    const user = await createTestUser({})
    const service = new BackendLogService()

    // Push logs in order
    const logEntry1 = BackendLogService.createLogEntry({
      requestId: 'req-1',
      method: 'GET',
      url: '/api/first',
      statusCode: 200,
      durationMs: 10,
    })

    const logEntry2 = BackendLogService.createLogEntry({
      requestId: 'req-2',
      method: 'GET',
      url: '/api/second',
      statusCode: 200,
      durationMs: 20,
    })

    const logEntry3 = BackendLogService.createLogEntry({
      requestId: 'req-3',
      method: 'GET',
      url: '/api/third',
      statusCode: 200,
      durationMs: 30,
    })

    await service.pushLog(user.id.toString(), logEntry1)
    await service.pushLog(user.id.toString(), logEntry2)
    await service.pushLog(user.id.toString(), logEntry3)

    const logs = await service.getUserLogs(user.id.toString())

    // Most recent should be first (LPUSH adds to head)
    assert.lengthOf(logs, 3)
    assert.equal(logs[0].requestId, 'req-3')
    assert.equal(logs[1].requestId, 'req-2')
    assert.equal(logs[2].requestId, 'req-1')
  })

  test('getUserLogs should respect limit parameter', async ({ assert }) => {
    const user = await createTestUser({})
    const service = new BackendLogService()

    // Push 5 logs
    for (let i = 1; i <= 5; i++) {
      const logEntry = BackendLogService.createLogEntry({
        requestId: `req-${i}`,
        method: 'GET',
        url: `/api/endpoint-${i}`,
        statusCode: 200,
        durationMs: i * 10,
      })
      await service.pushLog(user.id.toString(), logEntry)
    }

    // Request only 3
    const logs = await service.getUserLogs(user.id.toString(), 3)

    assert.lengthOf(logs, 3)
    // Should get the 3 most recent
    assert.equal(logs[0].requestId, 'req-5')
    assert.equal(logs[1].requestId, 'req-4')
    assert.equal(logs[2].requestId, 'req-3')
  })

  test('clearUserLogs should remove all logs for user', async ({ assert }) => {
    const user = await createTestUser({})
    const service = new BackendLogService()

    // Push some logs
    const logEntry = BackendLogService.createLogEntry({
      requestId: 'test-req',
      method: 'GET',
      url: '/api/test',
      statusCode: 200,
      durationMs: 50,
    })
    await service.pushLog(user.id.toString(), logEntry)

    // Verify log exists
    let logs = await service.getUserLogs(user.id.toString())
    assert.lengthOf(logs, 1)

    // Clear logs
    await service.clearUserLogs(user.id.toString())

    // Verify logs are gone
    logs = await service.getUserLogs(user.id.toString())
    assert.lengthOf(logs, 0)
  })

  test('logs should be isolated per user', async ({ assert }) => {
    const user1 = await createTestUser({})
    const user2 = await createTestUser({})
    const service = new BackendLogService()

    // Push log for user1
    const logEntry1 = BackendLogService.createLogEntry({
      requestId: 'user1-req',
      method: 'GET',
      url: '/api/user1',
      statusCode: 200,
      durationMs: 10,
    })
    await service.pushLog(user1.id.toString(), logEntry1)

    // Push log for user2
    const logEntry2 = BackendLogService.createLogEntry({
      requestId: 'user2-req',
      method: 'GET',
      url: '/api/user2',
      statusCode: 200,
      durationMs: 20,
    })
    await service.pushLog(user2.id.toString(), logEntry2)

    // Each user should only see their own logs
    const logs1 = await service.getUserLogs(user1.id.toString())
    const logs2 = await service.getUserLogs(user2.id.toString())

    assert.lengthOf(logs1, 1)
    assert.equal(logs1[0].requestId, 'user1-req')

    assert.lengthOf(logs2, 1)
    assert.equal(logs2[0].requestId, 'user2-req')
  })

  test('should handle streamer users', async ({ assert }) => {
    const streamer = await createTestStreamer()
    const service = new BackendLogService()

    const logEntry = BackendLogService.createLogEntry({
      requestId: 'streamer-req',
      method: 'POST',
      url: '/api/authorize',
      statusCode: 200,
      durationMs: 100,
    })

    await service.pushLog(streamer.userId!.toString(), logEntry)

    const logs = await service.getUserLogs(streamer.userId!.toString())

    assert.lengthOf(logs, 1)
    assert.equal(logs[0].requestId, 'streamer-req')
  })

  test('should store error logs correctly', async ({ assert }) => {
    const user = await createTestUser({})
    const service = new BackendLogService()

    const logEntry = BackendLogService.createLogEntry({
      requestId: 'error-req',
      method: 'POST',
      url: '/api/polls/launch',
      statusCode: 500,
      durationMs: 250,
      error: 'Internal server error: Database connection failed',
    })

    await service.pushLog(user.id.toString(), logEntry)

    const logs = await service.getUserLogs(user.id.toString())

    assert.lengthOf(logs, 1)
    assert.equal(logs[0].level, 'error')
    assert.equal(logs[0].error, 'Internal server error: Database connection failed')
  })
})
