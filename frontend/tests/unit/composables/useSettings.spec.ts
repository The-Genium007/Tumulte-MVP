import { describe, test, expect, beforeEach, vi } from 'vitest'

// Mock $fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

describe('useSettings Composable', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock useRuntimeConfig
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked((globalThis as any).useRuntimeConfig).mockReturnValue({
      public: {
        apiBase: 'http://localhost:3333/api/v2',
      },
    } as ReturnType<typeof useRuntimeConfig>)
  })

  describe('revokeTwitchAccess', () => {
    test('should call POST /dashboard/revoke with correct options', async () => {
      mockFetch.mockResolvedValueOnce({ success: true })

      const { useSettings } = await import('~/composables/useSettings')
      const { revokeTwitchAccess } = useSettings()

      const result = await revokeTwitchAccess()

      expect(mockFetch).toHaveBeenCalledWith('/dashboard/revoke', {
        method: 'POST',
        baseURL: 'http://localhost:3333/api/v2',
        credentials: 'include',
      })
      expect(result).toEqual({ success: true })
    })

    test('should throw error with message from response', async () => {
      const errorResponse = { data: { error: 'Token invalide' } }
      mockFetch.mockRejectedValueOnce(errorResponse)

      const { useSettings } = await import('~/composables/useSettings')
      const { revokeTwitchAccess } = useSettings()

      await expect(revokeTwitchAccess()).rejects.toThrow('Token invalide')
    })

    test('should throw default error message when no error data', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { useSettings } = await import('~/composables/useSettings')
      const { revokeTwitchAccess } = useSettings()

      await expect(revokeTwitchAccess()).rejects.toThrow('Erreur lors de la révocation')
    })
  })

  describe('deleteAccount', () => {
    test('should call DELETE /account/delete with correct options', async () => {
      mockFetch.mockResolvedValueOnce({ success: true })

      const { useSettings } = await import('~/composables/useSettings')
      const { deleteAccount } = useSettings()

      const result = await deleteAccount()

      expect(mockFetch).toHaveBeenCalledWith('/account/delete', {
        method: 'DELETE',
        baseURL: 'http://localhost:3333/api/v2',
        credentials: 'include',
      })
      expect(result).toEqual({ success: true })
    })

    test('should throw error with message from response', async () => {
      const errorResponse = { data: { error: 'Compte introuvable' } }
      mockFetch.mockRejectedValueOnce(errorResponse)

      const { useSettings } = await import('~/composables/useSettings')
      const { deleteAccount } = useSettings()

      await expect(deleteAccount()).rejects.toThrow('Compte introuvable')
    })

    test('should throw default error message when no error data', async () => {
      mockFetch.mockRejectedValueOnce({})

      const { useSettings } = await import('~/composables/useSettings')
      const { deleteAccount } = useSettings()

      await expect(deleteAccount()).rejects.toThrow('Erreur lors de la suppression du compte')
    })
  })
})
