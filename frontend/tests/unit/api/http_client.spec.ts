import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest'
import axios from 'axios'
import type { AxiosError } from 'axios'

// Mock axios
vi.mock('axios')

// Mock window.location
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(window as any).location = { href: '' }

// Mock process.client
;(global as { process: { client: boolean } }).process = {
  client: true,
}

describe('HTTP Client', () => {
  let httpClient: typeof import('~/api/http_client').httpClient
  let mockAxiosInstance: {
    get: ReturnType<typeof vi.fn>
    post: ReturnType<typeof vi.fn>
    put: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
    patch: ReturnType<typeof vi.fn>
    interceptors: {
      request: {
        use: ReturnType<typeof vi.fn>
      }
      response: {
        use: ReturnType<typeof vi.fn>
      }
    }
  }

  beforeEach(async () => {
    vi.clearAllMocks()

    // Mock useRuntimeConfig
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked((globalThis as any).useRuntimeConfig).mockReturnValue({
      public: {
        apiBase: 'http://localhost:3333/api/v2',
      },
    } as ReturnType<typeof useRuntimeConfig>)

    // Create mock axios instance
    mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn(),
      interceptors: {
        request: {
          use: vi.fn((successCallback) => {
            // Store the success callback for testing
            return successCallback
          }),
        },
        response: {
          use: vi.fn((successCallback, errorCallback) => {
            // Store callbacks for testing
            ;(
              mockAxiosInstance.interceptors.response as {
                _errorCallback?: unknown
              }
            )._errorCallback = errorCallback
            return { successCallback, errorCallback }
          }),
        },
      },
    }

    // Type assertion for the error callback storage
    ;(
      mockAxiosInstance.interceptors.response as {
        _errorCallback?: (error: AxiosError) => Promise<never>
      }
    )._errorCallback = undefined

    // Mock axios.create
    vi.mocked(axios.create).mockReturnValue(
      mockAxiosInstance as unknown as ReturnType<typeof axios.create>
    )

    // Re-import to get fresh instance
    const module = await import('~/api/http_client')
    httpClient = module.httpClient
  })

  afterEach(() => {
    vi.resetModules()
  })

  test('should create axios instance with correct config', () => {
    expect(axios.create).toHaveBeenCalledWith({
      baseURL: 'http://localhost:3333/api/v2',
      timeout: 30000,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  })

  test('should setup request and response interceptors', () => {
    expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled()
    expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled()
  })

  test('get() should make GET request and return data', async () => {
    const mockData = { id: 1, name: 'Test' }
    mockAxiosInstance.get.mockResolvedValueOnce({ data: mockData })

    const result = await httpClient.get('/test')

    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', {
      params: undefined,
    })
    expect(result).toEqual(mockData)
  })

  test('get() should pass query params', async () => {
    const mockData = { results: [] }
    const params = { page: 1, limit: 10 }
    mockAxiosInstance.get.mockResolvedValueOnce({ data: mockData })

    await httpClient.get('/test', params)

    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', { params })
  })

  test('post() should make POST request and return data', async () => {
    const mockData = { id: 1, created: true }
    const postData = { name: 'New Item' }
    mockAxiosInstance.post.mockResolvedValueOnce({ data: mockData })

    const result = await httpClient.post('/test', postData)

    expect(mockAxiosInstance.post).toHaveBeenCalledWith('/test', postData)
    expect(result).toEqual(mockData)
  })

  test('put() should make PUT request and return data', async () => {
    const mockData = { id: 1, updated: true }
    const putData = { name: 'Updated Item' }
    mockAxiosInstance.put.mockResolvedValueOnce({ data: mockData })

    const result = await httpClient.put('/test/1', putData)

    expect(mockAxiosInstance.put).toHaveBeenCalledWith('/test/1', putData)
    expect(result).toEqual(mockData)
  })

  test('delete() should make DELETE request and return data', async () => {
    const mockData = { deleted: true }
    mockAxiosInstance.delete.mockResolvedValueOnce({ data: mockData })

    const result = await httpClient.delete('/test/1')

    expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/test/1')
    expect(result).toEqual(mockData)
  })

  test('patch() should make PATCH request and return data', async () => {
    const mockData = { id: 1, patched: true }
    const patchData = { status: 'active' }
    mockAxiosInstance.patch.mockResolvedValueOnce({ data: mockData })

    const result = await httpClient.patch('/test/1', patchData)

    expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/test/1', patchData)
    expect(result).toEqual(mockData)
  })

  test('should redirect to login on 401 error', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Get the error callback
    const errorCallback = (
      mockAxiosInstance.interceptors.response as {
        _errorCallback?: (error: AxiosError) => Promise<never>
      }
    )._errorCallback

    expect(errorCallback).toBeDefined()

    if (errorCallback) {
      const error = {
        response: {
          status: 401,
        },
      } as AxiosError

      await expect(errorCallback(error)).rejects.toEqual(error)
      expect(window.location.href).toBe('/auth/twitch/redirect')
    }

    consoleErrorSpy.mockRestore()
  })

  test('should log error on 403', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const errorCallback = (
      mockAxiosInstance.interceptors.response as {
        _errorCallback?: (error: AxiosError) => Promise<never>
      }
    )._errorCallback

    if (errorCallback) {
      const error = {
        response: {
          status: 403,
        },
      } as AxiosError

      await expect(errorCallback(error)).rejects.toEqual(error)
      expect(consoleErrorSpy).toHaveBeenCalledWith('Accès interdit')
    }

    consoleErrorSpy.mockRestore()
  })

  test('should log error on 404', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const errorCallback = (
      mockAxiosInstance.interceptors.response as {
        _errorCallback?: (error: AxiosError) => Promise<never>
      }
    )._errorCallback

    if (errorCallback) {
      const error = {
        response: {
          status: 404,
        },
      } as AxiosError

      await expect(errorCallback(error)).rejects.toEqual(error)
      expect(consoleErrorSpy).toHaveBeenCalledWith('Ressource non trouvée')
    }

    consoleErrorSpy.mockRestore()
  })

  test('should log error on 500', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const errorCallback = (
      mockAxiosInstance.interceptors.response as {
        _errorCallback?: (error: AxiosError) => Promise<never>
      }
    )._errorCallback

    if (errorCallback) {
      const error = {
        response: {
          status: 500,
        },
      } as AxiosError

      await expect(errorCallback(error)).rejects.toEqual(error)
      expect(consoleErrorSpy).toHaveBeenCalledWith('Erreur serveur:', error)
    }

    consoleErrorSpy.mockRestore()
  })

  test('should handle network errors (no response)', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const errorCallback = (
      mockAxiosInstance.interceptors.response as {
        _errorCallback?: (error: AxiosError) => Promise<never>
      }
    )._errorCallback

    if (errorCallback) {
      const error = {
        request: {},
      } as AxiosError

      await expect(errorCallback(error)).rejects.toEqual(error)
      expect(consoleErrorSpy).toHaveBeenCalledWith('Aucune réponse du serveur:', error)
    }

    consoleErrorSpy.mockRestore()
  })

  test('should handle request configuration errors', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const errorCallback = (
      mockAxiosInstance.interceptors.response as {
        _errorCallback?: (error: AxiosError) => Promise<never>
      }
    )._errorCallback

    if (errorCallback) {
      const error = {
        message: 'Invalid config',
      } as AxiosError

      await expect(errorCallback(error)).rejects.toEqual(error)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Erreur de configuration de la requête:',
        'Invalid config'
      )
    }

    consoleErrorSpy.mockRestore()
  })
})
