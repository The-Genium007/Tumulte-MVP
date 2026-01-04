import { test } from '@japa/runner'
import { BackendLogService, type BackendLogEntry } from '#services/support/backend_log_service'

/**
 * Tests for BackendLogService
 * Note: These tests use mocked Redis - no actual Redis connection needed
 */
test.group('BackendLogService - createLogEntry static method', () => {
  test('should create info level entry for 2xx status codes', ({ assert }) => {
    const entry = BackendLogService.createLogEntry({
      requestId: 'req-123',
      method: 'GET',
      url: '/api/campaigns',
      statusCode: 200,
      durationMs: 50,
    })

    assert.equal(entry.level, 'info')
    assert.equal(entry.requestId, 'req-123')
    assert.equal(entry.method, 'GET')
    assert.equal(entry.url, '/api/campaigns')
    assert.equal(entry.statusCode, 200)
    assert.equal(entry.durationMs, 50)
    assert.isUndefined(entry.error)
    assert.exists(entry.timestamp)
  })

  test('should create info level entry for 3xx status codes', ({ assert }) => {
    const entry = BackendLogService.createLogEntry({
      requestId: 'req-456',
      method: 'GET',
      url: '/api/redirect',
      statusCode: 302,
      durationMs: 10,
    })

    assert.equal(entry.level, 'info')
  })

  test('should create warn level entry for 4xx status codes', ({ assert }) => {
    const entry = BackendLogService.createLogEntry({
      requestId: 'req-789',
      method: 'POST',
      url: '/api/campaigns',
      statusCode: 400,
      durationMs: 25,
    })

    assert.equal(entry.level, 'warn')
  })

  test('should create warn level entry for 404', ({ assert }) => {
    const entry = BackendLogService.createLogEntry({
      requestId: 'req-404',
      method: 'GET',
      url: '/api/not-found',
      statusCode: 404,
      durationMs: 15,
    })

    assert.equal(entry.level, 'warn')
  })

  test('should create error level entry for 5xx status codes', ({ assert }) => {
    const entry = BackendLogService.createLogEntry({
      requestId: 'req-500',
      method: 'POST',
      url: '/api/polls/launch',
      statusCode: 500,
      durationMs: 150,
    })

    assert.equal(entry.level, 'error')
  })

  test('should include error message when provided', ({ assert }) => {
    const entry = BackendLogService.createLogEntry({
      requestId: 'req-err',
      method: 'POST',
      url: '/api/sessions',
      statusCode: 500,
      durationMs: 200,
      error: 'Database connection failed',
    })

    assert.equal(entry.error, 'Database connection failed')
    assert.equal(entry.level, 'error')
  })

  test('should generate valid ISO timestamp', ({ assert }) => {
    const beforeTimestamp = new Date().toISOString()

    const entry = BackendLogService.createLogEntry({
      requestId: 'req-time',
      method: 'GET',
      url: '/api/test',
      statusCode: 200,
      durationMs: 10,
    })

    const afterTimestamp = new Date().toISOString()

    // Timestamp should be between before and after
    assert.isTrue(entry.timestamp >= beforeTimestamp)
    assert.isTrue(entry.timestamp <= afterTimestamp)

    // Should be valid ISO string
    const parsed = new Date(entry.timestamp)
    assert.isFalse(isNaN(parsed.getTime()))
  })
})

test.group('BackendLogService - Entry structure validation', () => {
  test('entry should have all required fields', ({ assert }) => {
    const entry = BackendLogService.createLogEntry({
      requestId: 'req-structure',
      method: 'PUT',
      url: '/api/campaigns/123',
      statusCode: 200,
      durationMs: 75,
    })

    // Required fields
    assert.property(entry, 'timestamp')
    assert.property(entry, 'requestId')
    assert.property(entry, 'method')
    assert.property(entry, 'url')
    assert.property(entry, 'statusCode')
    assert.property(entry, 'durationMs')
    assert.property(entry, 'level')
  })

  test('entry should be JSON serializable', ({ assert }) => {
    const entry = BackendLogService.createLogEntry({
      requestId: 'req-json',
      method: 'DELETE',
      url: '/api/templates/456',
      statusCode: 204,
      durationMs: 30,
      error: 'Some error with "quotes" and special chars: <>&',
    })

    // Should not throw
    const json = JSON.stringify(entry)
    const parsed = JSON.parse(json) as BackendLogEntry

    // Should preserve all values
    assert.equal(parsed.requestId, entry.requestId)
    assert.equal(parsed.method, entry.method)
    assert.equal(parsed.url, entry.url)
    assert.equal(parsed.statusCode, entry.statusCode)
    assert.equal(parsed.durationMs, entry.durationMs)
    assert.equal(parsed.level, entry.level)
    assert.equal(parsed.error, entry.error)
  })
})

test.group('BackendLogService - Level assignment boundaries', () => {
  test('status 399 should be info', ({ assert }) => {
    const entry = BackendLogService.createLogEntry({
      requestId: 'req-399',
      method: 'GET',
      url: '/api/test',
      statusCode: 399,
      durationMs: 10,
    })
    assert.equal(entry.level, 'info')
  })

  test('status 400 should be warn', ({ assert }) => {
    const entry = BackendLogService.createLogEntry({
      requestId: 'req-400',
      method: 'GET',
      url: '/api/test',
      statusCode: 400,
      durationMs: 10,
    })
    assert.equal(entry.level, 'warn')
  })

  test('status 499 should be warn', ({ assert }) => {
    const entry = BackendLogService.createLogEntry({
      requestId: 'req-499',
      method: 'GET',
      url: '/api/test',
      statusCode: 499,
      durationMs: 10,
    })
    assert.equal(entry.level, 'warn')
  })

  test('status 500 should be error', ({ assert }) => {
    const entry = BackendLogService.createLogEntry({
      requestId: 'req-500',
      method: 'GET',
      url: '/api/test',
      statusCode: 500,
      durationMs: 10,
    })
    assert.equal(entry.level, 'error')
  })

  test('status 503 should be error', ({ assert }) => {
    const entry = BackendLogService.createLogEntry({
      requestId: 'req-503',
      method: 'GET',
      url: '/api/test',
      statusCode: 503,
      durationMs: 10,
    })
    assert.equal(entry.level, 'error')
  })
})

test.group('BackendLogService - HTTP methods', () => {
  test('should handle all HTTP methods', ({ assert }) => {
    const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

    methods.forEach((method) => {
      const entry = BackendLogService.createLogEntry({
        requestId: `req-${method.toLowerCase()}`,
        method,
        url: '/api/test',
        statusCode: 200,
        durationMs: 10,
      })

      assert.equal(entry.method, method)
    })
  })
})

test.group('BackendLogService - URL handling', () => {
  test('should preserve query strings in URL', ({ assert }) => {
    const entry = BackendLogService.createLogEntry({
      requestId: 'req-query',
      method: 'GET',
      url: '/api/campaigns?page=1&limit=10&search=test',
      statusCode: 200,
      durationMs: 25,
    })

    assert.equal(entry.url, '/api/campaigns?page=1&limit=10&search=test')
  })

  test('should handle URLs with special characters', ({ assert }) => {
    const entry = BackendLogService.createLogEntry({
      requestId: 'req-special',
      method: 'GET',
      url: '/api/search?q=hello%20world&filter=%7B%22type%22%3A%22poll%22%7D',
      statusCode: 200,
      durationMs: 30,
    })

    assert.include(entry.url, 'hello%20world')
  })
})
