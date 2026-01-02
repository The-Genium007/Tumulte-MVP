import { test } from '@japa/runner'
import RoleMiddleware from '#middleware/role_middleware'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { user as User } from '#models/user'

test.group('RoleMiddleware - Access Control', () => {
  test('should allow access when user has required role', async ({ assert }) => {
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

  test('should deny access when user has different role', async ({ assert }) => {
    const middleware = new RoleMiddleware()
    let nextCalled = false
    let responseStatus: number | undefined
    let responseBody: unknown

    const mockUser = {
      id: '00000000-0000-4000-d000-000000000001',
      role: 'STREAMER',
    } as User

    const mockContext = {
      auth: {
        user: mockUser,
      },
      response: {
        forbidden: (body: unknown) => {
          responseStatus = 403
          responseBody = body
          return { status: 403, body }
        },
      },
    } as unknown as HttpContext

    const next: NextFn = async () => {
      nextCalled = true
    }

    const result = await middleware.handle(mockContext, next, { role: 'MJ' })

    assert.isFalse(nextCalled)
    assert.equal(responseStatus, 403)
    assert.deepEqual(responseBody, { error: 'Access denied: insufficient permissions' })
    assert.exists(result)
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

test.group('RoleMiddleware - MJ Role', () => {
  test('should allow MJ to access MJ routes', async ({ assert }) => {
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

  test('should block STREAMER from accessing MJ routes', async ({ assert }) => {
    const middleware = new RoleMiddleware()
    let responseStatus: number | undefined
    let responseBody: unknown

    const mockUser = {
      id: '00000000-0000-4000-d000-000000000001',
      role: 'STREAMER',
    } as User

    const mockContext = {
      auth: {
        user: mockUser,
      },
      response: {
        forbidden: (body: unknown) => {
          responseStatus = 403
          responseBody = body
          return { status: 403, body }
        },
      },
    } as unknown as HttpContext

    const next: NextFn = async () => {}

    await middleware.handle(mockContext, next, { role: 'MJ' })

    assert.equal(responseStatus, 403)
    assert.deepEqual(responseBody, { error: 'Access denied: insufficient permissions' })
  })
})

test.group('RoleMiddleware - STREAMER Role', () => {
  test('should allow STREAMER to access STREAMER routes', async ({ assert }) => {
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

    await middleware.handle(mockContext, next, { role: 'STREAMER' })

    assert.isTrue(nextCalled)
  })

  test('should block MJ from accessing STREAMER-only routes', async ({ assert }) => {
    const middleware = new RoleMiddleware()
    let responseStatus: number | undefined

    const mockUser = {
      id: '00000000-0000-4000-d000-000000000001',
      role: 'MJ',
    } as User

    const mockContext = {
      auth: {
        user: mockUser,
      },
      response: {
        forbidden: (body: unknown) => {
          responseStatus = 403
          return { status: 403, body }
        },
      },
    } as unknown as HttpContext

    const next: NextFn = async () => {}

    await middleware.handle(mockContext, next, { role: 'STREAMER' })

    assert.equal(responseStatus, 403)
  })
})

test.group('RoleMiddleware - Edge Cases', () => {
  test('should handle user with null role', async ({ assert }) => {
    const middleware = new RoleMiddleware()
    let responseStatus: number | undefined

    const mockUser = {
      id: '00000000-0000-4000-d000-000000000001',
      role: null,
    } as unknown as User

    const mockContext = {
      auth: {
        user: mockUser,
      },
      response: {
        forbidden: (body: unknown) => {
          responseStatus = 403
          return { status: 403, body }
        },
      },
    } as unknown as HttpContext

    const next: NextFn = async () => {}

    await middleware.handle(mockContext, next, { role: 'MJ' })

    assert.equal(responseStatus, 403)
  })

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

  test('should enforce strict role matching (case sensitive)', async ({ assert }) => {
    const middleware = new RoleMiddleware()
    let responseStatus: number | undefined

    const mockUser = {
      id: '00000000-0000-4000-d000-000000000001',
      role: 'mj', // lowercase
    } as unknown as User

    const mockContext = {
      auth: {
        user: mockUser,
      },
      response: {
        forbidden: (body: unknown) => {
          responseStatus = 403
          return { status: 403, body }
        },
      },
    } as unknown as HttpContext

    const next: NextFn = async () => {}

    await middleware.handle(mockContext, next, { role: 'MJ' })

    assert.equal(responseStatus, 403)
  })
})

test.group('RoleMiddleware - Response Handling', () => {
  test('should return forbidden response with correct error message', async ({ assert }) => {
    const middleware = new RoleMiddleware()
    let errorMessage: string | undefined

    const mockUser = {
      id: '00000000-0000-4000-d000-000000000001',
      role: 'STREAMER',
    } as User

    const mockContext = {
      auth: {
        user: mockUser,
      },
      response: {
        forbidden: (body: { error: string }) => {
          errorMessage = body.error
          return { status: 403, body }
        },
      },
    } as unknown as HttpContext

    const next: NextFn = async () => {}

    await middleware.handle(mockContext, next, { role: 'MJ' })

    assert.equal(errorMessage, 'Access denied: insufficient permissions')
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
