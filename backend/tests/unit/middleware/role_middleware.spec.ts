import { test } from '@japa/runner'
import RoleMiddleware from '#middleware/role_middleware'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { user as User } from '#models/user'

/**
 * Role middleware tests - Updated to reflect disabled role checking
 *
 * The role middleware now allows all authenticated users to access any section.
 * Role checking has been disabled to allow MJ and Streamers to access all parts.
 */

test.group('RoleMiddleware - Authentication Check', () => {
  test('should allow access for any authenticated user regardless of role', async ({ assert }) => {
    const middleware = new RoleMiddleware()
    let nextCalled = false

    const mockUser = {
      id: '00000000-0000-4000-d000-000000000001',
      role: 'MJ',
    } as User

    const mockContext = {
      auth: {
        user: mockUser,
      },
    } as unknown as HttpContext

    const next: NextFn = async () => {
      nextCalled = true
    }

    await middleware.handle(mockContext, next, { role: 'MJ' })

    assert.isTrue(nextCalled)
  })

  test('should allow STREAMER to access MJ routes (role check disabled)', async ({ assert }) => {
    const middleware = new RoleMiddleware()
    let nextCalled = false

    const mockUser = {
      id: '00000000-0000-4000-d000-000000000001',
      role: 'STREAMER',
    } as User

    const mockContext = {
      auth: {
        user: mockUser,
      },
    } as unknown as HttpContext

    const next: NextFn = async () => {
      nextCalled = true
    }

    await middleware.handle(mockContext, next, { role: 'MJ' })

    assert.isTrue(nextCalled, 'STREAMER should be able to access MJ routes')
  })

  test('should allow MJ to access STREAMER routes (role check disabled)', async ({ assert }) => {
    const middleware = new RoleMiddleware()
    let nextCalled = false

    const mockUser = {
      id: '00000000-0000-4000-d000-000000000001',
      role: 'MJ',
    } as User

    const mockContext = {
      auth: {
        user: mockUser,
      },
    } as unknown as HttpContext

    const next: NextFn = async () => {
      nextCalled = true
    }

    await middleware.handle(mockContext, next, { role: 'STREAMER' })

    assert.isTrue(nextCalled, 'MJ should be able to access STREAMER routes')
  })

  test('should return 401 when user is not authenticated', async ({ assert }) => {
    const middleware = new RoleMiddleware()
    let nextCalled = false
    let responseStatus: number | undefined
    let responseBody: unknown

    const mockContext = {
      auth: {
        user: null, // No authenticated user
      },
      response: {
        unauthorized: (body: unknown) => {
          responseStatus = 401
          responseBody = body
          return { status: 401, body }
        },
      },
    } as unknown as HttpContext

    const next: NextFn = async () => {
      nextCalled = true
    }

    const result = await middleware.handle(mockContext, next, { role: 'MJ' })

    assert.isFalse(nextCalled)
    assert.equal(responseStatus, 401)
    assert.deepEqual(responseBody, { error: 'Unauthorized' })
    assert.exists(result)
  })

  test('should return 401 when user is undefined', async ({ assert }) => {
    const middleware = new RoleMiddleware()
    let responseStatus: number | undefined

    const mockContext = {
      auth: {
        user: undefined, // Undefined user
      },
      response: {
        unauthorized: (body: unknown) => {
          responseStatus = 401
          return { status: 401, body }
        },
      },
    } as unknown as HttpContext

    const next: NextFn = async () => {}

    await middleware.handle(mockContext, next, { role: 'MJ' })

    assert.equal(responseStatus, 401)
  })
})

test.group('RoleMiddleware - Response Handling', () => {
  test('should return next result when access is granted', async ({ assert }) => {
    const middleware = new RoleMiddleware()
    const expectedResult = { data: 'success' }

    const mockUser = {
      id: '00000000-0000-4000-d000-000000000001',
      role: 'MJ',
    } as User

    const mockContext = {
      auth: {
        user: mockUser,
      },
    } as unknown as HttpContext

    const next: NextFn = async () => expectedResult

    const result = await middleware.handle(mockContext, next, { role: 'MJ' })

    assert.deepEqual(result, expectedResult)
  })

  test('should return unauthorized response with correct error message', async ({ assert }) => {
    const middleware = new RoleMiddleware()
    let errorMessage: string | undefined

    const mockContext = {
      auth: {
        user: null,
      },
      response: {
        unauthorized: (body: { error: string }) => {
          errorMessage = body.error
          return { status: 401, body }
        },
      },
    } as unknown as HttpContext

    const next: NextFn = async () => {}

    await middleware.handle(mockContext, next, { role: 'MJ' })

    assert.equal(errorMessage, 'Unauthorized')
  })
})
