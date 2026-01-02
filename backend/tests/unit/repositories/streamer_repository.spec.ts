import { test } from '@japa/runner'
import type { streamer as Streamer } from '#models/streamer'
import StreamerRepository from '#repositories/streamer_repository'

test.group('StreamerRepository - findById', () => {
  let repository: StreamerRepository
  let mockStreamerModel: any

  test.group.each.setup(() => {
    mockStreamerModel = {
      find: async (id: string) => {
        if (id === 'streamer-123') {
          return {
            id: 'streamer-123',
            twitchLogin: 'teststreamer',
            isActive: true,
          } as Streamer
        }
        return null
      },
    }

    repository = new StreamerRepository()
    ;(repository as any).streamerModel = mockStreamerModel
  })

  test('should find streamer by id', async ({ assert }) => {
    const mockModel = {
      find: async (id: string) => {
        if (id === 'streamer-123') {
          return {
            id: 'streamer-123',
            twitchLogin: 'teststreamer',
          } as Streamer
        }
        return null
      },
    }

    // Mock global Streamer
    const originalStreamer = (global as any).Streamer
    ;(global as any).Streamer = mockModel

    const result = await repository.findById('streamer-123')

    ;(global as any).Streamer = originalStreamer

    assert.equal(result?.id, 'streamer-123')
    assert.equal(result?.twitchLogin, 'teststreamer')
  })

  test('should return null if streamer not found', async ({ assert }) => {
    const mockModel = {
      find: async (id: string) => null,
    }

    const originalStreamer = (global as any).Streamer
    ;(global as any).Streamer = mockModel

    const result = await repository.findById('non-existent')

    ;(global as any).Streamer = originalStreamer

    assert.isNull(result)
  })
})

test.group('StreamerRepository - findByUserId', () => {
  let repository: StreamerRepository

  test.group.each.setup(() => {
    repository = new StreamerRepository()
  })

  test('should find streamer by userId', async ({ assert }) => {
    const mockStreamerModel = {
      findBy: async (field: string, value: string) => {
        if (field === 'userId' && value === 'user-123') {
          return {
            id: 'streamer-123',
            userId: 'user-123',
            twitchLogin: 'teststreamer',
          } as Streamer
        }
        return null
      },
    }

    const originalStreamer = (global as any).Streamer
    ;(global as any).Streamer = mockStreamerModel

    const result = await repository.findByUserId('user-123')

    ;(global as any).Streamer = originalStreamer

    assert.equal(result?.userId, 'user-123')
    assert.equal(result?.id, 'streamer-123')
  })

  test('should return null if no streamer with userId', async ({ assert }) => {
    const mockStreamerModel = {
      findBy: async (field: string, value: string) => null,
    }

    const originalStreamer = (global as any).Streamer
    ;(global as any).Streamer = mockStreamerModel

    const result = await repository.findByUserId('user-999')

    ;(global as any).Streamer = originalStreamer

    assert.isNull(result)
  })
})

test.group('StreamerRepository - findByTwitchUserId', () => {
  let repository: StreamerRepository

  test.group.each.setup(() => {
    repository = new StreamerRepository()
  })

  test('should find streamer by twitchUserId', async ({ assert }) => {
    const mockStreamerModel = {
      findBy: async (field: string, value: string) => {
        if (field === 'twitchUserId' && value === '12345') {
          return {
            id: 'streamer-123',
            twitchUserId: '12345',
            twitchLogin: 'teststreamer',
          } as Streamer
        }
        return null
      },
    }

    const originalStreamer = (global as any).Streamer
    ;(global as any).Streamer = mockStreamerModel

    const result = await repository.findByTwitchUserId('12345')

    ;(global as any).Streamer = originalStreamer

    assert.equal(result?.twitchUserId, '12345')
    assert.equal(result?.id, 'streamer-123')
  })

  test('should return null if no streamer with twitchUserId', async ({ assert }) => {
    const mockStreamerModel = {
      findBy: async (field: string, value: string) => null,
    }

    const originalStreamer = (global as any).Streamer
    ;(global as any).Streamer = mockStreamerModel

    const result = await repository.findByTwitchUserId('99999')

    ;(global as any).Streamer = originalStreamer

    assert.isNull(result)
  })
})

test.group('StreamerRepository - findByTwitchUsername', () => {
  let repository: StreamerRepository

  test.group.each.setup(() => {
    repository = new StreamerRepository()
  })

  test('should find streamer by twitchUsername', async ({ assert }) => {
    const mockStreamerModel = {
      findBy: async (field: string, value: string) => {
        if (field === 'twitchLogin' && value === 'teststreamer') {
          return {
            id: 'streamer-123',
            twitchLogin: 'teststreamer',
          } as Streamer
        }
        return null
      },
    }

    const originalStreamer = (global as any).Streamer
    ;(global as any).Streamer = mockStreamerModel

    const result = await repository.findByTwitchUsername('teststreamer')

    ;(global as any).Streamer = originalStreamer

    assert.equal(result?.twitchLogin, 'teststreamer')
  })

  test('should return null if no streamer with twitchUsername', async ({ assert }) => {
    const mockStreamerModel = {
      findBy: async (field: string, value: string) => null,
    }

    const originalStreamer = (global as any).Streamer
    ;(global as any).Streamer = mockStreamerModel

    const result = await repository.findByTwitchUsername('unknownstreamer')

    ;(global as any).Streamer = originalStreamer

    assert.isNull(result)
  })
})

test.group('StreamerRepository - findByIds', () => {
  let repository: StreamerRepository

  test.group.each.setup(() => {
    repository = new StreamerRepository()
  })

  test('should find multiple streamers by ids', async ({ assert }) => {
    const mockStreamers = [
      { id: 'streamer-1', twitchLogin: 'streamer1' },
      { id: 'streamer-2', twitchLogin: 'streamer2' },
    ] as Streamer[]

    const mockStreamerModel = {
      query: () => ({
        whereIn: function (field: string, values: string[]) {
          return mockStreamers
        },
      }),
    }

    const originalStreamer = (global as any).Streamer
    ;(global as any).Streamer = mockStreamerModel

    const result = await repository.findByIds(['streamer-1', 'streamer-2'])

    ;(global as any).Streamer = originalStreamer

    assert.lengthOf(result, 2)
    assert.equal(result[0].id, 'streamer-1')
    assert.equal(result[1].id, 'streamer-2')
  })

  test('should return empty array if no streamers found', async ({ assert }) => {
    const mockStreamerModel = {
      query: () => ({
        whereIn: function (field: string, values: string[]) {
          return []
        },
      }),
    }

    const originalStreamer = (global as any).Streamer
    ;(global as any).Streamer = mockStreamerModel

    const result = await repository.findByIds(['non-existent'])

    ;(global as any).Streamer = originalStreamer

    assert.lengthOf(result, 0)
  })
})

test.group('StreamerRepository - create', () => {
  let repository: StreamerRepository

  test.group.each.setup(() => {
    repository = new StreamerRepository()
  })

  test('should create new streamer with encrypted tokens', async ({ assert }) => {
    let updateTokensCalled = false
    let savedTokens: { access: string; refresh: string } | null = null

    const mockStreamerInstance = {
      userId: '',
      twitchUserId: '',
      twitchLogin: '',
      scopes: '',
      profileImageUrl: null,
      broadcasterType: '',
      isActive: false,
      updateTokens: async (accessToken: string, refreshToken: string) => {
        updateTokensCalled = true
        savedTokens = { access: accessToken, refresh: refreshToken }
      },
    } as unknown as Streamer

    const mockStreamerConstructor = function (this: any) {
      Object.assign(this, mockStreamerInstance)
      return this
    }

    const originalStreamer = (global as any).Streamer
    ;(global as any).Streamer = mockStreamerConstructor

    const data = {
      userId: 'user-123',
      twitchUserId: '12345',
      twitchUsername: 'teststreamer',
      accessToken: 'access_token_123',
      refreshToken: 'refresh_token_123',
      scopes: ['chat:read', 'chat:write'],
      profileImageUrl: 'https://example.com/avatar.png',
      broadcasterType: 'affiliate',
    }

    const result = await repository.create(data)

    ;(global as any).Streamer = originalStreamer

    assert.isTrue(updateTokensCalled)
    assert.equal(savedTokens?.access, 'access_token_123')
    assert.equal(savedTokens?.refresh, 'refresh_token_123')
  })

  test('should set default values for optional fields', async ({ assert }) => {
    const mockStreamerInstance = {
      userId: '',
      twitchUserId: '',
      twitchLogin: '',
      scopes: '',
      profileImageUrl: null,
      broadcasterType: '',
      isActive: false,
      updateTokens: async () => {},
    } as unknown as Streamer

    const mockStreamerConstructor = function (this: any) {
      Object.assign(this, mockStreamerInstance)
      return this
    }

    const originalStreamer = (global as any).Streamer
    ;(global as any).Streamer = mockStreamerConstructor

    const data = {
      userId: 'user-123',
      twitchUserId: '12345',
      twitchUsername: 'teststreamer',
      accessToken: 'access_token',
      refreshToken: 'refresh_token',
      scopes: ['chat:read'],
    }

    const result = await repository.create(data)

    ;(global as any).Streamer = originalStreamer

    assert.isNull(result.profileImageUrl)
    assert.equal(result.broadcasterType, '')
    assert.isTrue(result.isActive)
  })

  test('should stringify scopes as JSON', async ({ assert }) => {
    const mockStreamerInstance = {
      userId: '',
      twitchUserId: '',
      twitchLogin: '',
      scopes: '',
      profileImageUrl: null,
      broadcasterType: '',
      isActive: false,
      updateTokens: async () => {},
    } as unknown as Streamer

    const mockStreamerConstructor = function (this: any) {
      Object.assign(this, mockStreamerInstance)
      return this
    }

    const originalStreamer = (global as any).Streamer
    ;(global as any).Streamer = mockStreamerConstructor

    const data = {
      userId: 'user-123',
      twitchUserId: '12345',
      twitchUsername: 'teststreamer',
      accessToken: 'access_token',
      refreshToken: 'refresh_token',
      scopes: ['chat:read', 'chat:write', 'channel:manage:polls'],
    }

    const result = await repository.create(data)

    ;(global as any).Streamer = originalStreamer

    assert.include(result.scopes, 'chat:read')
  })
})

test.group('StreamerRepository - update', () => {
  let repository: StreamerRepository

  test.group.each.setup(() => {
    repository = new StreamerRepository()
  })

  test('should update streamer', async ({ assert }) => {
    let saveCalled = false

    const mockStreamer = {
      id: 'streamer-123',
      twitchLogin: 'teststreamer',
      save: async () => {
        saveCalled = true
      },
    } as unknown as Streamer

    await repository.update(mockStreamer)

    assert.isTrue(saveCalled)
  })
})

test.group('StreamerRepository - delete', () => {
  let repository: StreamerRepository

  test.group.each.setup(() => {
    repository = new StreamerRepository()
  })

  test('should delete streamer', async ({ assert }) => {
    let deleteCalled = false

    const mockStreamer = {
      id: 'streamer-123',
      delete: async () => {
        deleteCalled = true
      },
    } as unknown as Streamer

    await repository.delete(mockStreamer)

    assert.isTrue(deleteCalled)
  })
})

test.group('StreamerRepository - findActive', () => {
  let repository: StreamerRepository

  test.group.each.setup(() => {
    repository = new StreamerRepository()
  })

  test('should return only active streamers', async ({ assert }) => {
    const mockActiveStreamers = [
      { id: 'streamer-1', isActive: true },
      { id: 'streamer-2', isActive: true },
    ] as Streamer[]

    const mockStreamerModel = {
      query: () => ({
        where: function (field: string, value: boolean) {
          if (field === 'isActive' && value === true) {
            return mockActiveStreamers
          }
          return []
        },
      }),
    }

    const originalStreamer = (global as any).Streamer
    ;(global as any).Streamer = mockStreamerModel

    const result = await repository.findActive()

    ;(global as any).Streamer = originalStreamer

    assert.lengthOf(result, 2)
    assert.isTrue(result[0].isActive)
    assert.isTrue(result[1].isActive)
  })

  test('should return empty array if no active streamers', async ({ assert }) => {
    const mockStreamerModel = {
      query: () => ({
        where: function (field: string, value: boolean) {
          return []
        },
      }),
    }

    const originalStreamer = (global as any).Streamer
    ;(global as any).Streamer = mockStreamerModel

    const result = await repository.findActive()

    ;(global as any).Streamer = originalStreamer

    assert.lengthOf(result, 0)
  })
})

test.group('StreamerRepository - deactivate', () => {
  let repository: StreamerRepository

  test.group.each.setup(() => {
    repository = new StreamerRepository()
  })

  test('should deactivate streamer by id', async ({ assert }) => {
    let saveCalled = false

    const mockStreamer = {
      id: 'streamer-123',
      isActive: true,
      save: async function (this: any) {
        saveCalled = true
        assert.isFalse(this.isActive)
      },
    } as unknown as Streamer

    const mockStreamerModel = {
      find: async (id: string) => {
        if (id === 'streamer-123') return mockStreamer
        return null
      },
    }

    const originalStreamer = (global as any).Streamer
    ;(global as any).Streamer = mockStreamerModel

    await repository.deactivate('streamer-123')
    ;(global as any).Streamer = originalStreamer

    assert.isTrue(saveCalled)
    assert.isFalse(mockStreamer.isActive)
  })

  test('should do nothing if streamer not found', async ({ assert }) => {
    const mockStreamerModel = {
      find: async (id: string) => null,
    }

    const originalStreamer = (global as any).Streamer
    ;(global as any).Streamer = mockStreamerModel

    await repository.deactivate('non-existent')
    ;(global as any).Streamer = originalStreamer

    // Should not throw
    assert.isTrue(true)
  })
})

test.group('StreamerRepository - activate', () => {
  let repository: StreamerRepository

  test.group.each.setup(() => {
    repository = new StreamerRepository()
  })

  test('should activate streamer by id', async ({ assert }) => {
    let saveCalled = false

    const mockStreamer = {
      id: 'streamer-123',
      isActive: false,
      save: async function (this: any) {
        saveCalled = true
        assert.isTrue(this.isActive)
      },
    } as unknown as Streamer

    const mockStreamerModel = {
      find: async (id: string) => {
        if (id === 'streamer-123') return mockStreamer
        return null
      },
    }

    const originalStreamer = (global as any).Streamer
    ;(global as any).Streamer = mockStreamerModel

    await repository.activate('streamer-123')
    ;(global as any).Streamer = originalStreamer

    assert.isTrue(saveCalled)
    assert.isTrue(mockStreamer.isActive)
  })

  test('should do nothing if streamer not found', async ({ assert }) => {
    const mockStreamerModel = {
      find: async (id: string) => null,
    }

    const originalStreamer = (global as any).Streamer
    ;(global as any).Streamer = mockStreamerModel

    await repository.activate('non-existent')
    ;(global as any).Streamer = originalStreamer

    // Should not throw
    assert.isTrue(true)
  })
})

test.group('StreamerRepository - isCompatibleForPolls', () => {
  let repository: StreamerRepository

  test.group.each.setup(() => {
    repository = new StreamerRepository()
  })

  test('should return true for affiliate broadcaster', async ({ assert }) => {
    const mockStreamer = {
      id: 'streamer-123',
      broadcasterType: 'affiliate',
    } as Streamer

    const mockStreamerModel = {
      find: async (id: string) => {
        if (id === 'streamer-123') return mockStreamer
        return null
      },
    }

    const originalStreamer = (global as any).Streamer
    ;(global as any).Streamer = mockStreamerModel

    const result = await repository.isCompatibleForPolls('streamer-123')

    ;(global as any).Streamer = originalStreamer

    assert.isTrue(result)
  })

  test('should return true for partner broadcaster', async ({ assert }) => {
    const mockStreamer = {
      id: 'streamer-123',
      broadcasterType: 'partner',
    } as Streamer

    const mockStreamerModel = {
      find: async (id: string) => {
        if (id === 'streamer-123') return mockStreamer
        return null
      },
    }

    const originalStreamer = (global as any).Streamer
    ;(global as any).Streamer = mockStreamerModel

    const result = await repository.isCompatibleForPolls('streamer-123')

    ;(global as any).Streamer = originalStreamer

    assert.isTrue(result)
  })

  test('should return true for uppercase AFFILIATE', async ({ assert }) => {
    const mockStreamer = {
      id: 'streamer-123',
      broadcasterType: 'AFFILIATE',
    } as Streamer

    const mockStreamerModel = {
      find: async (id: string) => {
        if (id === 'streamer-123') return mockStreamer
        return null
      },
    }

    const originalStreamer = (global as any).Streamer
    ;(global as any).Streamer = mockStreamerModel

    const result = await repository.isCompatibleForPolls('streamer-123')

    ;(global as any).Streamer = originalStreamer

    assert.isTrue(result)
  })

  test('should return false for empty broadcasterType', async ({ assert }) => {
    const mockStreamer = {
      id: 'streamer-123',
      broadcasterType: '',
    } as Streamer

    const mockStreamerModel = {
      find: async (id: string) => {
        if (id === 'streamer-123') return mockStreamer
        return null
      },
    }

    const originalStreamer = (global as any).Streamer
    ;(global as any).Streamer = mockStreamerModel

    const result = await repository.isCompatibleForPolls('streamer-123')

    ;(global as any).Streamer = originalStreamer

    assert.isFalse(result)
  })

  test('should return false if streamer not found', async ({ assert }) => {
    const mockStreamerModel = {
      find: async (id: string) => null,
    }

    const originalStreamer = (global as any).Streamer
    ;(global as any).Streamer = mockStreamerModel

    const result = await repository.isCompatibleForPolls('non-existent')

    ;(global as any).Streamer = originalStreamer

    assert.isFalse(result)
  })
})
