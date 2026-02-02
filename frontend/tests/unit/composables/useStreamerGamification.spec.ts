import { describe, test, expect, beforeEach, vi } from 'vitest'
import { useStreamerGamification } from '~/composables/useStreamerGamification'
import type { StreamerGamificationEvent } from '~/composables/useStreamerGamification'

// Mock fetch globally
global.fetch = vi.fn()

// Mock useToast
const mockToastAdd = vi.fn()
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis as any).useToast = vi.fn(() => ({
  add: mockToastAdd,
}))

const createMockEvent = (
  overrides: Partial<StreamerGamificationEvent> = {}
): StreamerGamificationEvent => ({
  eventId: 'event-1',
  eventName: 'Dice Reverse',
  eventSlug: 'dice_reverse',
  eventDescription: 'Reverse the dice roll',
  actionType: 'dice_invert',
  rewardColor: '#9146FF',
  isEnabledByCampaign: true,
  isEnabledByStreamer: false,
  twitchRewardId: null,
  twitchRewardStatus: 'not_created',
  recommendedCost: 1000,
  streamerCostOverride: null,
  effectiveCost: 1000,
  difficultyExplanation: 'Medium difficulty',
  ...overrides,
})

describe('useStreamerGamification Composable', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock useRuntimeConfig
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked((globalThis as any).useRuntimeConfig).mockReturnValue({
      public: {
        apiBase: 'http://localhost:3333',
      },
    } as ReturnType<typeof useRuntimeConfig>)
  })

  test('should initialize with default state', () => {
    const { events, hasAnyEnabled, canUseChannelPoints, isLoading, error } =
      useStreamerGamification('campaign-1')

    expect(events.value).toEqual([])
    expect(hasAnyEnabled.value).toBe(false)
    expect(canUseChannelPoints.value).toBe(true)
    expect(isLoading.value).toBe(false)
    expect(error.value).toBeNull()
  })

  describe('fetchEvents', () => {
    test('should fetch events successfully', async () => {
      const mockEvents = [
        createMockEvent({ eventId: 'event-1', isEnabledByStreamer: true }),
        createMockEvent({ eventId: 'event-2', isEnabledByStreamer: false }),
      ]

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            events: mockEvents,
            hasAnyEnabled: true,
            canUseChannelPoints: true,
          },
        }),
      } as Response)

      const { fetchEvents, events, hasAnyEnabled, canUseChannelPoints } =
        useStreamerGamification('campaign-1')
      await fetchEvents()

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3333/dashboard/campaigns/campaign-1/gamification',
        { credentials: 'include' }
      )
      expect(events.value).toEqual(mockEvents)
      expect(hasAnyEnabled.value).toBe(true)
      expect(canUseChannelPoints.value).toBe(true)
    })

    test('should handle non-affiliate streamer', async () => {
      const mockEvents = [createMockEvent()]

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            events: mockEvents,
            hasAnyEnabled: false,
            canUseChannelPoints: false,
          },
        }),
      } as Response)

      const { fetchEvents, canUseChannelPoints } = useStreamerGamification('campaign-1')
      await fetchEvents()

      expect(canUseChannelPoints.value).toBe(false)
    })

    test('should handle HTTP errors', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 403,
      } as Response)

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { fetchEvents, error } = useStreamerGamification('campaign-1')
      await fetchEvents()

      expect(error.value).toBe('HTTP 403')
      consoleErrorSpy.mockRestore()
    })

    test('should set loading state correctly', async () => {
      let resolveFetch: ((value: Response) => void) | undefined
      const fetchPromise = new Promise<Response>((resolve) => {
        resolveFetch = resolve
      })

      vi.mocked(fetch).mockReturnValueOnce(fetchPromise as Promise<Response>)

      const { fetchEvents, isLoading } = useStreamerGamification('campaign-1')
      const fetchPromiseResult = fetchEvents()

      expect(isLoading.value).toBe(true)

      if (resolveFetch) {
        resolveFetch({
          ok: true,
          json: async () => ({
            data: { events: [], hasAnyEnabled: false, canUseChannelPoints: true },
          }),
        } as Response)
      }

      await fetchPromiseResult
      expect(isLoading.value).toBe(false)
    })
  })

  describe('enableEvent', () => {
    test('should enable event successfully', async () => {
      // First fetch events
      const mockEvents = [createMockEvent({ eventId: 'event-1', isEnabledByStreamer: false })]

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { events: mockEvents, hasAnyEnabled: false, canUseChannelPoints: true },
        }),
      } as Response)

      const { fetchEvents, enableEvent, events, hasAnyEnabled } =
        useStreamerGamification('campaign-1')
      await fetchEvents()

      // Then enable
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            eventId: 'event-1',
            isEnabledByStreamer: true,
            twitchRewardId: 'reward-123',
            twitchRewardStatus: 'active',
            effectiveCost: 1000,
          },
          message: 'Récompense activée',
        }),
      } as Response)

      const result = await enableEvent('event-1')

      expect(result).toBe(true)
      expect(fetch).toHaveBeenLastCalledWith(
        'http://localhost:3333/dashboard/campaigns/campaign-1/gamification/events/event-1/enable',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({}),
        }
      )
      expect(events.value[0]?.isEnabledByStreamer).toBe(true)
      expect(events.value[0]?.twitchRewardId).toBe('reward-123')
      expect(hasAnyEnabled.value).toBe(true)
      expect(mockToastAdd).toHaveBeenCalledWith({
        title: 'Récompense activée',
        description: 'Récompense activée',
        color: 'success',
      })
    })

    test('should enable event with cost override', async () => {
      const mockEvents = [createMockEvent({ eventId: 'event-1' })]

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { events: mockEvents, hasAnyEnabled: false, canUseChannelPoints: true },
        }),
      } as Response)

      const { fetchEvents, enableEvent } = useStreamerGamification('campaign-1')
      await fetchEvents()

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            eventId: 'event-1',
            isEnabledByStreamer: true,
            twitchRewardId: 'reward-123',
            twitchRewardStatus: 'active',
            effectiveCost: 500,
          },
          message: 'Récompense activée',
        }),
      } as Response)

      await enableEvent('event-1', 500)

      expect(fetch).toHaveBeenLastCalledWith(
        'http://localhost:3333/dashboard/campaigns/campaign-1/gamification/events/event-1/enable',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ costOverride: 500 }),
        }
      )
    })

    test('should handle enable errors', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Twitch API error' }),
      } as Response)

      const { enableEvent } = useStreamerGamification('campaign-1')
      const result = await enableEvent('event-1')

      expect(result).toBe(false)
      expect(mockToastAdd).toHaveBeenCalledWith({
        title: 'Erreur',
        description: 'Twitch API error',
        color: 'error',
      })
    })
  })

  describe('disableEvent', () => {
    test('should disable event successfully', async () => {
      const mockEvents = [
        createMockEvent({
          eventId: 'event-1',
          isEnabledByStreamer: true,
          twitchRewardId: 'reward-123',
          twitchRewardStatus: 'active',
        }),
      ]

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { events: mockEvents, hasAnyEnabled: true, canUseChannelPoints: true },
        }),
      } as Response)

      const { fetchEvents, disableEvent, events, hasAnyEnabled } =
        useStreamerGamification('campaign-1')
      await fetchEvents()

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)

      const result = await disableEvent('event-1')

      expect(result).toBe(true)
      expect(fetch).toHaveBeenLastCalledWith(
        'http://localhost:3333/dashboard/campaigns/campaign-1/gamification/events/event-1/disable',
        {
          method: 'POST',
          credentials: 'include',
        }
      )
      expect(events.value[0]?.isEnabledByStreamer).toBe(false)
      expect(events.value[0]?.twitchRewardId).toBeNull()
      expect(events.value[0]?.twitchRewardStatus).toBe('not_created')
      expect(hasAnyEnabled.value).toBe(false)
    })

    test('should handle disable errors', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Cannot disable reward' }),
      } as Response)

      const { disableEvent } = useStreamerGamification('campaign-1')
      const result = await disableEvent('event-1')

      expect(result).toBe(false)
      expect(mockToastAdd).toHaveBeenCalledWith({
        title: 'Erreur',
        description: 'Cannot disable reward',
        color: 'error',
      })
    })
  })

  describe('updateCost', () => {
    test('should update cost successfully', async () => {
      const mockEvents = [createMockEvent({ eventId: 'event-1', effectiveCost: 1000 })]

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { events: mockEvents, hasAnyEnabled: false, canUseChannelPoints: true },
        }),
      } as Response)

      const { fetchEvents, updateCost, events } = useStreamerGamification('campaign-1')
      await fetchEvents()

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            eventId: 'event-1',
            streamerCostOverride: 500,
            effectiveCost: 500,
          },
          message: 'Coût mis à jour',
        }),
      } as Response)

      const result = await updateCost('event-1', 500)

      expect(result).toBe(true)
      expect(fetch).toHaveBeenLastCalledWith(
        'http://localhost:3333/dashboard/campaigns/campaign-1/gamification/events/event-1/cost',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ cost: 500 }),
        }
      )
      expect(events.value[0]?.streamerCostOverride).toBe(500)
      expect(events.value[0]?.effectiveCost).toBe(500)
      expect(mockToastAdd).toHaveBeenCalledWith({
        title: 'Coût mis à jour',
        description: 'Coût mis à jour',
        color: 'success',
      })
    })

    test('should handle update cost errors', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invalid cost' }),
      } as Response)

      const { updateCost } = useStreamerGamification('campaign-1')
      const result = await updateCost('event-1', -100)

      expect(result).toBe(false)
      expect(mockToastAdd).toHaveBeenCalledWith({
        title: 'Erreur',
        description: 'Invalid cost',
        color: 'error',
      })
    })
  })

  describe('toggleEvent', () => {
    test('should enable when currently disabled', async () => {
      const mockEvents = [createMockEvent({ eventId: 'event-1', isEnabledByStreamer: false })]

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { events: mockEvents, hasAnyEnabled: false, canUseChannelPoints: true },
        }),
      } as Response)

      const { fetchEvents, toggleEvent } = useStreamerGamification('campaign-1')
      await fetchEvents()

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            eventId: 'event-1',
            isEnabledByStreamer: true,
            twitchRewardId: 'reward-123',
            twitchRewardStatus: 'active',
            effectiveCost: 1000,
          },
          message: 'Récompense activée',
        }),
      } as Response)

      await toggleEvent('event-1')

      expect(fetch).toHaveBeenLastCalledWith(expect.stringContaining('/enable'), expect.any(Object))
    })

    test('should disable when currently enabled', async () => {
      const mockEvents = [createMockEvent({ eventId: 'event-1', isEnabledByStreamer: true })]

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { events: mockEvents, hasAnyEnabled: true, canUseChannelPoints: true },
        }),
      } as Response)

      const { fetchEvents, toggleEvent } = useStreamerGamification('campaign-1')
      await fetchEvents()

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)

      await toggleEvent('event-1')

      expect(fetch).toHaveBeenLastCalledWith(
        expect.stringContaining('/disable'),
        expect.any(Object)
      )
    })

    test('should return false for unknown event', async () => {
      const { toggleEvent } = useStreamerGamification('campaign-1')
      const result = await toggleEvent('unknown-event')

      expect(result).toBe(false)
    })
  })

  describe('isEventLoading', () => {
    test('should track loading state per event', async () => {
      let resolveFetch: ((value: Response) => void) | undefined
      const fetchPromise = new Promise<Response>((resolve) => {
        resolveFetch = resolve
      })

      // First fetch events
      const mockEvents = [createMockEvent({ eventId: 'event-1' })]
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { events: mockEvents, hasAnyEnabled: false, canUseChannelPoints: true },
        }),
      } as Response)

      const { fetchEvents, enableEvent, isEventLoading } = useStreamerGamification('campaign-1')
      await fetchEvents()

      vi.mocked(fetch).mockReturnValueOnce(fetchPromise as Promise<Response>)

      const enablePromise = enableEvent('event-1')
      expect(isEventLoading('event-1')).toBe(true)
      expect(isEventLoading('event-2')).toBe(false)

      if (resolveFetch) {
        resolveFetch({
          ok: true,
          json: async () => ({
            data: {
              eventId: 'event-1',
              isEnabledByStreamer: true,
              twitchRewardId: 'reward-123',
              twitchRewardStatus: 'active',
              effectiveCost: 1000,
            },
            message: 'OK',
          }),
        } as Response)
      }

      await enablePromise
      expect(isEventLoading('event-1')).toBe(false)
    })
  })

  describe('with ref campaignId', () => {
    test('should work with ref campaignId', async () => {
      const { ref } = await import('vue')
      const campaignIdRef = ref('campaign-1')

      const mockEvents = [createMockEvent()]
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { events: mockEvents, hasAnyEnabled: false, canUseChannelPoints: true },
        }),
      } as Response)

      const { fetchEvents } = useStreamerGamification(campaignIdRef)
      await fetchEvents()

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3333/dashboard/campaigns/campaign-1/gamification',
        { credentials: 'include' }
      )

      // Change campaignId
      campaignIdRef.value = 'campaign-2'

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { events: mockEvents, hasAnyEnabled: false, canUseChannelPoints: true },
        }),
      } as Response)

      await fetchEvents()

      expect(fetch).toHaveBeenLastCalledWith(
        'http://localhost:3333/dashboard/campaigns/campaign-2/gamification',
        { credentials: 'include' }
      )
    })
  })
})
