import { test } from '@japa/runner'
import AuthMiddleware from '#middleware/auth_middleware'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

test.group('AuthMiddleware - Authentication Enforcement', () => {
  test('should call authenticateUsing with provided guards', async ({ assert }) => {
    const middleware = new AuthMiddleware()
    let authenticateCalledWith: { guards?: string[]; loginRoute?: string } | undefined

    const mockContext = {
      auth: {
        authenticateUsing: async (guards?: string[], options?: { loginRoute?: string }) => {
          authenticateCalledWith = { guards, ...options }
        },
      },
    } as unknown as HttpContext

    const next: NextFn = async () => {}

    await middleware.handle(mockContext, next, { guards: ['web'] })

    assert.isDefined(authenticateCalledWith)
    assert.deepEqual(authenticateCalledWith?.guards, ['web'])
    assert.equal(authenticateCalledWith?.loginRoute, '/login')
  })

  test('should use default /login redirect when no guards specified', async ({ assert }) => {
    const middleware = new AuthMiddleware()
    let loginRoute: string | undefined

    const mockContext = {
      auth: {
        authenticateUsing: async (_guards?: string[], options?: { loginRoute?: string }) => {
          loginRoute = options?.loginRoute
        },
      },
    } as unknown as HttpContext

    const next: NextFn = async () => {}

    await middleware.handle(mockContext, next)

    assert.equal(loginRoute, '/login')
  })

  test('should call next function after successful authentication', async ({ assert }) => {
    const middleware = new AuthMiddleware()
    let nextCalled = false

    const mockContext = {
      auth: {
        authenticateUsing: async () => {
          // Simulate successful authentication
        },
      },
    } as unknown as HttpContext

    const next: NextFn = async () => {
      nextCalled = true
    }

    await middleware.handle(mockContext, next)

    assert.isTrue(nextCalled)
  })

  test('should pass empty array when no guards provided', async ({ assert }) => {
    const middleware = new AuthMiddleware()
    let guardsReceived: string[] | undefined

    const mockContext = {
      auth: {
        authenticateUsing: async (guards?: string[]) => {
          guardsReceived = guards
        },
      },
    } as unknown as HttpContext

    const next: NextFn = async () => {}

    await middleware.handle(mockContext, next, {})

    assert.isUndefined(guardsReceived)
  })

  test('should support multiple guards', async ({ assert }) => {
    const middleware = new AuthMiddleware()
    let guardsReceived: string[] | undefined

    const mockContext = {
      auth: {
        authenticateUsing: async (guards?: string[]) => {
          guardsReceived = guards
        },
      },
    } as unknown as HttpContext

    const next: NextFn = async () => {}

    await middleware.handle(mockContext, next, { guards: ['web', 'api'] })

    assert.deepEqual(guardsReceived, ['web', 'api'])
  })

  test('should throw error when authentication fails', async ({ assert }) => {
    const middleware = new AuthMiddleware()

    const mockContext = {
      auth: {
        authenticateUsing: async () => {
          throw new Error('Authentication failed')
        },
      },
    } as unknown as HttpContext

    const next: NextFn = async () => {}

    await assert.rejects(
      async () => await middleware.handle(mockContext, next),
      'Authentication failed'
    )
  })

  test('should use configured redirectTo property', async ({ assert }) => {
    const middleware = new AuthMiddleware()
    middleware.redirectTo = '/custom-login'

    let loginRoute: string | undefined

    const mockContext = {
      auth: {
        authenticateUsing: async (_guards?: string[], options?: { loginRoute?: string }) => {
          loginRoute = options?.loginRoute
        },
      },
    } as unknown as HttpContext

    const next: NextFn = async () => {}

    await middleware.handle(mockContext, next)

    assert.equal(loginRoute, '/custom-login')
  })
})

test.group('AuthMiddleware - Edge Cases', () => {
  test('should handle null guards option', async ({ assert }) => {
    const middleware = new AuthMiddleware()
    let guardsReceived: string[] | undefined

    const mockContext = {
      auth: {
        authenticateUsing: async (guards?: string[]) => {
          guardsReceived = guards
        },
      },
    } as unknown as HttpContext

    const next: NextFn = async () => {}

    await middleware.handle(mockContext, next, { guards: undefined })

    assert.isUndefined(guardsReceived)
  })

  test('should return next function result', async ({ assert }) => {
    const middleware = new AuthMiddleware()
    const expectedResult = { success: true }

    const mockContext = {
      auth: {
        authenticateUsing: async () => {},
      },
    } as unknown as HttpContext

    const next: NextFn = async () => expectedResult

    const result = await middleware.handle(mockContext, next)

    assert.deepEqual(result, expectedResult)
  })
})
