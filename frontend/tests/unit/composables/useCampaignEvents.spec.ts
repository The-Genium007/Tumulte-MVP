import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useCampaignEvents } from '~/composables/useCampaignEvents'
import type { CampaignEvent } from '@/types/campaign-events'

describe('useCampaignEvents', () => {
  // Use partial mocks with type assertions since CampaignEvent types are complex
  const mockEvents = [
    {
      id: 'poll_event-1',
      type: 'poll',
      name: 'Test Poll',
      completedAt: '2024-01-15T10:05:00Z',
      icon: 'i-lucide-bar-chart-2',
      iconColor: 'text-success-600',
      primaryResult: { text: 'Option A', success: true },
      metadata: {
        pollInstanceId: 'poll-1',
        options: ['Option A', 'Option B'],
        winningOptions: ['Option A'],
        totalVotes: 150,
        votesByOption: { 'Option A': 100, 'Option B': 50 },
      },
    },
    {
      id: 'gamification_event-2',
      type: 'gamification_dice_reverse',
      name: 'Dice Reverse',
      completedAt: '2024-01-15T10:10:00Z',
      icon: 'i-lucide-dice-5',
      iconColor: 'text-orange-500',
      primaryResult: { text: 'Success', success: true },
      metadata: {
        eventSlug: 'gamification_dice_reverse',
        eventName: 'Dice Reverse',
        instanceId: 'instance-1',
        objectiveTarget: 100,
        currentProgress: 75,
        progressPercentage: 75,
        duration: 300,
        triggerData: null,
        resultData: null,
      },
    },
  ] as unknown as CampaignEvent[]

  let originalFetch: typeof global.fetch

  beforeEach(() => {
    originalFetch = global.fetch
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.useRealTimers()
  })

  describe('initialization', () => {
    it('should initialize with empty state', () => {
      const { events, loading, error } = useCampaignEvents()

      expect(events.value).toEqual([])
      expect(loading.value).toBe(false)
      expect(error.value).toBeNull()
    })
  })

  describe('fetchEvents', () => {
    it('should fetch and store events', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockEvents }),
      })

      const { events, loading, fetchEvents } = useCampaignEvents()

      const result = await fetchEvents('campaign-123')

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3333/mj/campaigns/campaign-123/events',
        { credentials: 'include' }
      )
      expect(result).toEqual(mockEvents)
      expect(events.value).toEqual(mockEvents)
      expect(loading.value).toBe(false)
    })

    it('should include limit parameter when provided', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockEvents }),
      })

      const { fetchEvents } = useCampaignEvents()

      await fetchEvents('campaign-123', { limit: 10 })

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3333/mj/campaigns/campaign-123/events?limit=10',
        { credentials: 'include' }
      )
    })

    it('should return empty array for empty campaignId', async () => {
      global.fetch = vi.fn()

      const { fetchEvents } = useCampaignEvents()

      const result = await fetchEvents('')

      expect(result).toEqual([])
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should handle null data in response', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: null }),
      })

      const { events, fetchEvents } = useCampaignEvents()

      const result = await fetchEvents('campaign-123')

      expect(result).toEqual([])
      expect(events.value).toEqual([])
    })

    it('should handle fetch error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
      })

      const { events, error, fetchEvents } = useCampaignEvents()

      await expect(fetchEvents('campaign-123')).rejects.toThrow('Failed to fetch campaign events')
      expect(error.value).toBe('Failed to fetch campaign events')
      expect(events.value).toEqual([])
    })

    it('should handle network error', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'))

      const { error, fetchEvents } = useCampaignEvents()

      await expect(fetchEvents('campaign-123')).rejects.toThrow('Network error')
      expect(error.value).toBe('Network error')
    })
  })

  describe('refreshEvents', () => {
    it('should refresh events after default delay', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockEvents }),
      })

      const { refreshEvents } = useCampaignEvents()

      const promise = refreshEvents('campaign-123')

      // Advance timers by 500ms (default delay)
      await vi.advanceTimersByTimeAsync(500)
      await promise

      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('should refresh events after custom delay', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockEvents }),
      })

      const { refreshEvents } = useCampaignEvents()

      const promise = refreshEvents('campaign-123', 1000)

      // After 500ms, fetch should not have been called
      await vi.advanceTimersByTimeAsync(500)
      expect(global.fetch).not.toHaveBeenCalled()

      // After 1000ms, fetch should be called
      await vi.advanceTimersByTimeAsync(500)
      await promise

      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('should refresh immediately when delay is 0', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockEvents }),
      })

      const { refreshEvents } = useCampaignEvents()

      await refreshEvents('campaign-123', 0)

      expect(global.fetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('formatRelativeDate', () => {
    it('should return empty string for empty input', () => {
      const { formatRelativeDate } = useCampaignEvents()

      expect(formatRelativeDate('')).toBe('')
    })

    it('should return "À l\'instant" for very recent dates', () => {
      const { formatRelativeDate } = useCampaignEvents()
      const now = new Date()

      vi.setSystemTime(now)

      expect(formatRelativeDate(now.toISOString())).toBe("À l'instant")
    })

    it('should return minutes format for dates within an hour', () => {
      const { formatRelativeDate } = useCampaignEvents()
      const now = new Date('2024-01-15T10:30:00Z')
      const date = new Date('2024-01-15T10:15:00Z')

      vi.setSystemTime(now)

      expect(formatRelativeDate(date.toISOString())).toBe('Il y a 15 min')
    })

    it('should return hours format for dates within a day', () => {
      const { formatRelativeDate } = useCampaignEvents()
      const now = new Date('2024-01-15T15:00:00Z')
      const date = new Date('2024-01-15T10:00:00Z')

      vi.setSystemTime(now)

      expect(formatRelativeDate(date.toISOString())).toBe('Il y a 5h')
    })

    it('should return days format for dates within a week', () => {
      const { formatRelativeDate } = useCampaignEvents()
      const now = new Date('2024-01-18T10:00:00Z')
      const date = new Date('2024-01-15T10:00:00Z')

      vi.setSystemTime(now)

      expect(formatRelativeDate(date.toISOString())).toBe('Il y a 3j')
    })

    it('should return formatted date for dates older than a week', () => {
      const { formatRelativeDate } = useCampaignEvents()
      const now = new Date('2024-01-30T10:00:00Z')
      const date = new Date('2024-01-15T10:30:00Z')

      vi.setSystemTime(now)

      const result = formatRelativeDate(date.toISOString())
      // The exact format depends on locale, but should contain day and month
      expect(result).toMatch(/15/)
      expect(result).toMatch(/janv/)
    })
  })

  describe('clearError', () => {
    it('should clear error state', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
      })

      const { error, fetchEvents, clearError } = useCampaignEvents()

      await expect(fetchEvents('campaign-123')).rejects.toThrow()
      expect(error.value).not.toBeNull()

      clearError()
      expect(error.value).toBeNull()
    })
  })

  describe('reset', () => {
    it('should reset all state', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockEvents }),
      })

      const { events, loading, error, fetchEvents, reset } = useCampaignEvents()

      await fetchEvents('campaign-123')
      expect(events.value).toHaveLength(2)

      reset()

      expect(events.value).toEqual([])
      expect(loading.value).toBe(false)
      expect(error.value).toBeNull()
    })

    it('should reset error state after fetch failure', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
      })

      const { error, fetchEvents, reset } = useCampaignEvents()

      await expect(fetchEvents('campaign-123')).rejects.toThrow()
      expect(error.value).not.toBeNull()

      reset()
      expect(error.value).toBeNull()
    })
  })
})
