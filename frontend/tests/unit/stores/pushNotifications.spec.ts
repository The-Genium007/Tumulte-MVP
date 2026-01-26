import { describe, test, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock localStorage
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => localStorageMock.store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageMock.store[key] = value
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageMock.store[key]
  }),
  clear: vi.fn(() => {
    localStorageMock.store = {}
  }),
}
vi.stubGlobal('localStorage', localStorageMock)

// Mock Notification API
const mockNotification = {
  permission: 'default' as NotificationPermission,
  requestPermission: vi.fn(),
}
vi.stubGlobal('Notification', mockNotification)

// Mock navigator.serviceWorker (partial - not fully functional)
const mockServiceWorker = {
  ready: Promise.resolve({
    pushManager: {
      getSubscription: vi.fn().mockResolvedValue(null),
      subscribe: vi.fn(),
    },
  }),
}

// Mock window with PushManager
vi.stubGlobal('navigator', {
  serviceWorker: mockServiceWorker,
})

// Ensure PushManager exists
vi.stubGlobal('PushManager', class PushManager {})

describe('Push Notifications Store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.store = {}
    mockNotification.permission = 'default'

    // Mock useRuntimeConfig
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked((globalThis as any).useRuntimeConfig).mockReturnValue({
      public: {
        apiBase: 'http://localhost:3333/api/v2',
      },
    } as ReturnType<typeof useRuntimeConfig>)

    setActivePinia(createPinia())
  })

  describe('Initial State', () => {
    test('should initialize with default values', async () => {
      const { usePushNotificationsStore } = await import('~/stores/pushNotifications')
      const store = usePushNotificationsStore()

      expect(store.vapidPublicKey).toBeNull()
      expect(store.subscriptions).toEqual([])
      expect(store.preferences).toBeNull()
      expect(store.loading).toBe(false)
      expect(store.bannerDismissed).toBe(false)
      expect(store.initialized).toBe(false)
    })

    test('should have permissionStatus as default', async () => {
      const { usePushNotificationsStore } = await import('~/stores/pushNotifications')
      const store = usePushNotificationsStore()

      expect(store.permissionStatus).toBe('default')
    })
  })

  describe('Computed Properties', () => {
    test('isSupported should be true when all APIs are available', async () => {
      const { usePushNotificationsStore } = await import('~/stores/pushNotifications')
      const store = usePushNotificationsStore()

      expect(store.isSupported).toBe(true)
    })

    test('isSubscribed should be false when no subscriptions', async () => {
      const { usePushNotificationsStore } = await import('~/stores/pushNotifications')
      const store = usePushNotificationsStore()

      expect(store.isSubscribed).toBe(false)
    })

    test('isSubscribed should be true when has subscriptions', async () => {
      const { usePushNotificationsStore } = await import('~/stores/pushNotifications')
      const store = usePushNotificationsStore()

      store.subscriptions = [
        {
          id: 'sub-1',
          endpoint: 'https://push.example.com/123',
          deviceName: 'Test Device',
          userAgent: null,
          createdAt: '2024-01-01T00:00:00Z',
          lastUsedAt: null,
        },
      ]

      expect(store.isSubscribed).toBe(true)
    })

    test('isPushEnabled should default to true when no preferences', async () => {
      const { usePushNotificationsStore } = await import('~/stores/pushNotifications')
      const store = usePushNotificationsStore()

      expect(store.isPushEnabled).toBe(true)
    })

    test('isPushEnabled should reflect preferences', async () => {
      const { usePushNotificationsStore } = await import('~/stores/pushNotifications')
      const store = usePushNotificationsStore()

      store.preferences = {
        pushEnabled: false,
        campaignInvitations: true,
        criticalAlerts: true,
        pollStarted: true,
        pollEnded: true,
        campaignMemberJoined: true,
        sessionReminder: true,
      }

      expect(store.isPushEnabled).toBe(false)
    })

    test('canRequestPermission should be true when default permission', async () => {
      const { usePushNotificationsStore } = await import('~/stores/pushNotifications')
      const store = usePushNotificationsStore()

      expect(store.canRequestPermission).toBe(true)
    })

    test('canRequestPermission should be false when permission granted', async () => {
      const { usePushNotificationsStore } = await import('~/stores/pushNotifications')
      const store = usePushNotificationsStore()

      store.permissionStatus = 'granted'

      expect(store.canRequestPermission).toBe(false)
    })

    test('isPermissionDenied should be false by default', async () => {
      const { usePushNotificationsStore } = await import('~/stores/pushNotifications')
      const store = usePushNotificationsStore()

      expect(store.isPermissionDenied).toBe(false)
    })

    test('isPermissionDenied should be true when denied', async () => {
      const { usePushNotificationsStore } = await import('~/stores/pushNotifications')
      const store = usePushNotificationsStore()

      store.permissionStatus = 'denied'

      expect(store.isPermissionDenied).toBe(true)
    })

    test('shouldShowBanner should be true by default', async () => {
      const { usePushNotificationsStore } = await import('~/stores/pushNotifications')
      const store = usePushNotificationsStore()

      expect(store.shouldShowBanner).toBe(true)
    })

    test('shouldShowBanner should be false when dismissed', async () => {
      const { usePushNotificationsStore } = await import('~/stores/pushNotifications')
      const store = usePushNotificationsStore()

      store.bannerDismissed = true

      expect(store.shouldShowBanner).toBe(false)
    })

    test('shouldShowBanner should be false when permission not default', async () => {
      const { usePushNotificationsStore } = await import('~/stores/pushNotifications')
      const store = usePushNotificationsStore()

      store.permissionStatus = 'granted'

      expect(store.shouldShowBanner).toBe(false)
    })
  })

  describe('Actions - Simple', () => {
    test('reset should clear all user-related state', async () => {
      const { usePushNotificationsStore } = await import('~/stores/pushNotifications')
      const store = usePushNotificationsStore()

      // Set some state
      store.subscriptions = [
        {
          id: '1',
          endpoint: 'test',
          deviceName: null,
          userAgent: null,
          createdAt: '',
          lastUsedAt: null,
        },
      ]
      store.preferences = { pushEnabled: true } as never
      store.initialized = true

      store.reset()

      expect(store.subscriptions).toEqual([])
      expect(store.preferences).toBeNull()
      expect(store.initialized).toBe(false)
    })

    test('checkPermissionStatus should update permissionStatus', async () => {
      mockNotification.permission = 'granted'

      const { usePushNotificationsStore } = await import('~/stores/pushNotifications')
      const store = usePushNotificationsStore()

      store.checkPermissionStatus()

      expect(store.permissionStatus).toBe('granted')
    })

    test('checkPermissionStatus should check localStorage for banner', async () => {
      localStorageMock.store['pushNotificationBannerDismissed'] = 'true'

      const { usePushNotificationsStore } = await import('~/stores/pushNotifications')
      const store = usePushNotificationsStore()

      store.checkPermissionStatus()

      expect(store.bannerDismissed).toBe(true)
    })

    test('dismissPermissionBanner should set bannerDismissed', async () => {
      const { usePushNotificationsStore } = await import('~/stores/pushNotifications')
      const store = usePushNotificationsStore()

      store.dismissPermissionBanner()

      expect(store.bannerDismissed).toBe(true)
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'pushNotificationBannerDismissed',
        'true'
      )
    })

    test('resetBannerDismissal should clear bannerDismissed', async () => {
      const { usePushNotificationsStore } = await import('~/stores/pushNotifications')
      const store = usePushNotificationsStore()

      store.bannerDismissed = true

      store.resetBannerDismissal()

      expect(store.bannerDismissed).toBe(false)
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('pushNotificationBannerDismissed')
    })

    test('shouldShowPermissionBanner should return shouldShowBanner value', async () => {
      const { usePushNotificationsStore } = await import('~/stores/pushNotifications')
      const store = usePushNotificationsStore()

      expect(store.shouldShowPermissionBanner()).toBe(store.shouldShowBanner)
    })
  })

  describe('Actions - API Calls', () => {
    test('fetchVapidPublicKey should fetch and cache key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ publicKey: 'test-vapid-key-123' }),
      })

      const { usePushNotificationsStore } = await import('~/stores/pushNotifications')
      const store = usePushNotificationsStore()

      const key = await store.fetchVapidPublicKey()

      expect(key).toBe('test-vapid-key-123')
      expect(store.vapidPublicKey).toBe('test-vapid-key-123')
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3333/api/v2/notifications/vapid-public-key',
        { credentials: 'include' }
      )
    })

    test('fetchVapidPublicKey should return cached key', async () => {
      const { usePushNotificationsStore } = await import('~/stores/pushNotifications')
      const store = usePushNotificationsStore()

      store.vapidPublicKey = 'cached-key'

      const key = await store.fetchVapidPublicKey()

      expect(key).toBe('cached-key')
      expect(mockFetch).not.toHaveBeenCalled()
    })

    test('fetchVapidPublicKey should throw on error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      })

      const { usePushNotificationsStore } = await import('~/stores/pushNotifications')
      const store = usePushNotificationsStore()

      await expect(store.fetchVapidPublicKey()).rejects.toThrow('Server error')
    })

    test('fetchSubscriptions should fetch and store subscriptions', async () => {
      const mockSubscriptions = [
        { id: '1', endpoint: 'https://push.example.com/1', createdAt: '' },
        { id: '2', endpoint: 'https://push.example.com/2', createdAt: '' },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockSubscriptions }),
      })

      const { usePushNotificationsStore } = await import('~/stores/pushNotifications')
      const store = usePushNotificationsStore()

      await store.fetchSubscriptions()

      expect(store.subscriptions).toEqual(mockSubscriptions)
    })

    test('fetchSubscriptions should throw on error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      const { usePushNotificationsStore } = await import('~/stores/pushNotifications')
      const store = usePushNotificationsStore()

      await expect(store.fetchSubscriptions()).rejects.toThrow()
    })

    test('fetchPreferences should fetch and store preferences', async () => {
      const mockPreferences = {
        pushEnabled: true,
        emailEnabled: false,
        campaignInvitations: true,
        pollStarted: true,
        pollEnded: false,
        sessionReminders: true,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockPreferences }),
      })

      const { usePushNotificationsStore } = await import('~/stores/pushNotifications')
      const store = usePushNotificationsStore()

      await store.fetchPreferences()

      expect(store.preferences).toEqual(mockPreferences)
    })

    test('updatePreferences should send PUT request', async () => {
      const updatedPreferences = {
        pushEnabled: false,
        emailEnabled: true,
        campaignInvitations: true,
        pollStarted: true,
        pollEnded: true,
        sessionReminders: true,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: updatedPreferences }),
      })

      const { usePushNotificationsStore } = await import('~/stores/pushNotifications')
      const store = usePushNotificationsStore()

      await store.updatePreferences({ pushEnabled: false })

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3333/api/v2/notifications/preferences',
        {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pushEnabled: false }),
        }
      )
      expect(store.preferences).toEqual(updatedPreferences)
    })
  })

  describe('isCurrentBrowserSubscribed', () => {
    test('should be false when no browserEndpoint', async () => {
      const { usePushNotificationsStore } = await import('~/stores/pushNotifications')
      const store = usePushNotificationsStore()

      store.subscriptions = [
        {
          id: '1',
          endpoint: 'test',
          deviceName: null,
          userAgent: null,
          createdAt: '',
          lastUsedAt: null,
        },
      ]
      // browserEndpoint is null by default

      expect(store.isCurrentBrowserSubscribed).toBe(false)
    })
  })
})
