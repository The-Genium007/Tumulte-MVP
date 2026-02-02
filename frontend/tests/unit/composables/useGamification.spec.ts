import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useGamification } from '~/composables/useGamification'
import type {
  GamificationEvent,
  CampaignGamificationConfig,
  GamificationInstance,
} from '@/types/api'

describe('useGamification', () => {
  // Use partial mocks with type assertions since API types are complex
  const mockEvents = [
    {
      id: 'event-1',
      name: 'Dice Reverse',
      slug: 'gamification_dice_reverse',
      description: 'Inverse le résultat du prochain jet de dé',
      actionType: 'dice_invert',
      isActive: true,
      defaultCost: 1000,
    },
    {
      id: 'event-2',
      name: 'Bonus HP',
      slug: 'bonus_hp',
      description: 'Ajoute des points de vie',
      actionType: 'stat_modify',
      isActive: true,
      defaultCost: 500,
    },
  ] as unknown as GamificationEvent[]

  const mockConfigs = [
    {
      id: 'config-1',
      campaignId: 'campaign-123',
      eventId: 'event-1',
      isEnabled: true,
      cost: 1500,
      cooldown: 300,
      effectiveCost: 1500,
    },
  ] as unknown as CampaignGamificationConfig[]

  const mockInstance = {
    id: 'instance-1',
    campaignId: 'campaign-123',
    eventId: 'event-1',
    status: 'active',
    triggerData: {},
    createdAt: '2024-01-15T10:00:00Z',
  } as unknown as GamificationInstance

  let originalFetch: typeof global.fetch

  beforeEach(() => {
    originalFetch = global.fetch
    vi.clearAllMocks()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  describe('initialization', () => {
    it('should initialize with empty state', () => {
      const { events, configs, activeInstance, loading, error } = useGamification()

      expect(events.value).toEqual([])
      expect(configs.value).toEqual([])
      expect(activeInstance.value).toBeNull()
      expect(loading.value).toBe(false)
      expect(error.value).toBeNull()
    })

    it('should provide computed properties', () => {
      const { enabledConfigs, hasEnabledEvents } = useGamification()

      expect(enabledConfigs.value).toEqual([])
      expect(hasEnabledEvents.value).toBe(false)
    })
  })

  describe('fetchEvents', () => {
    it('should fetch and store events', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockEvents }),
      })

      const { events, loading, fetchEvents } = useGamification()

      const result = await fetchEvents()

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3333/mj/gamification/events', {
        credentials: 'include',
      })
      expect(result).toEqual(mockEvents)
      expect(events.value).toEqual(mockEvents)
      expect(loading.value).toBe(false)
    })

    it('should handle fetch error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
      })

      const { error, fetchEvents } = useGamification()

      await expect(fetchEvents()).rejects.toThrow('Failed to fetch gamification events')
      expect(error.value).toBe('Failed to fetch gamification events')
    })
  })

  describe('fetchCampaignConfigs', () => {
    it('should fetch and store campaign configs', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockConfigs }),
      })

      const { configs, fetchCampaignConfigs, enabledConfigs, hasEnabledEvents } = useGamification()

      await fetchCampaignConfigs('campaign-123')

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3333/mj/campaigns/campaign-123/gamification',
        { credentials: 'include' }
      )
      expect(configs.value).toEqual(mockConfigs)
      expect(enabledConfigs.value).toHaveLength(1)
      expect(hasEnabledEvents.value).toBe(true)
    })

    it('should handle fetch error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
      })

      const { error, fetchCampaignConfigs } = useGamification()

      await expect(fetchCampaignConfigs('campaign-123')).rejects.toThrow()
      expect(error.value).toBe('Failed to fetch gamification config')
    })
  })

  describe('enableEvent', () => {
    it('should enable an event and add to configs', async () => {
      const newConfig = {
        id: 'config-2',
        campaignId: 'campaign-123',
        eventId: 'event-2',
        isEnabled: true,
        cost: 500,
        cooldown: 600,
        effectiveCost: 500,
      } as unknown as CampaignGamificationConfig

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: newConfig }),
      })

      const { configs, enableEvent } = useGamification()

      const result = await enableEvent('campaign-123', 'event-2')

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3333/mj/campaigns/campaign-123/gamification/events/event-2/enable',
        { method: 'POST', credentials: 'include' }
      )
      expect(result).toEqual(newConfig)
      expect(configs.value).toContainEqual(newConfig)
    })

    it('should update existing config if event already exists', async () => {
      const updatedConfig = {
        ...mockConfigs[0],
        cost: 2000,
        effectiveCost: 2000,
      } as unknown as CampaignGamificationConfig

      // First, add a config
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockConfigs[0] }),
      })

      const { configs, enableEvent } = useGamification()
      await enableEvent('campaign-123', 'event-1')

      // Then update it
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: updatedConfig }),
      })

      await enableEvent('campaign-123', 'event-1')

      expect(configs.value).toHaveLength(1)
      expect(configs.value[0]?.effectiveCost).toBe(2000)
    })

    it('should handle enable error with API message', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Event already enabled' }),
      })

      const { error, enableEvent } = useGamification()

      await expect(enableEvent('campaign-123', 'event-1')).rejects.toThrow('Event already enabled')
      expect(error.value).toBe('Event already enabled')
    })
  })

  describe('updateConfig', () => {
    it('should update an existing config', async () => {
      const updatedConfig = {
        ...mockConfigs[0],
        cost: 2500,
        cooldown: 400,
        effectiveCost: 2500,
      } as unknown as CampaignGamificationConfig

      // First, fetch configs to populate the state
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockConfigs }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: updatedConfig }),
        })

      const { configs, fetchCampaignConfigs, updateConfig } = useGamification()
      await fetchCampaignConfigs('campaign-123')

      const result = await updateConfig('campaign-123', 'event-1', {
        cost: 2500,
        cooldown: 400,
      })

      expect(global.fetch).toHaveBeenLastCalledWith(
        'http://localhost:3333/mj/campaigns/campaign-123/gamification/events/event-1',
        {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cost: 2500, cooldown: 400 }),
        }
      )
      expect(result).toEqual(updatedConfig)
      expect(configs.value[0]?.effectiveCost).toBe(2500)
    })

    it('should handle update error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Invalid cost' }),
      })

      const { error, updateConfig } = useGamification()

      await expect(updateConfig('campaign-123', 'event-1', { cost: -100 })).rejects.toThrow(
        'Invalid cost'
      )
      expect(error.value).toBe('Invalid cost')
    })
  })

  describe('disableEvent', () => {
    it('should disable an event and remove from configs', async () => {
      // First, populate configs
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockConfigs }),
        })
        .mockResolvedValueOnce({
          ok: true,
        })

      const { configs, fetchCampaignConfigs, disableEvent } = useGamification()
      await fetchCampaignConfigs('campaign-123')
      expect(configs.value).toHaveLength(1)

      await disableEvent('campaign-123', 'event-1')

      expect(global.fetch).toHaveBeenLastCalledWith(
        'http://localhost:3333/mj/campaigns/campaign-123/gamification/events/event-1/disable',
        { method: 'POST', credentials: 'include' }
      )
      expect(configs.value).toHaveLength(0)
    })

    it('should handle disable error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
      })

      const { error, disableEvent } = useGamification()

      await expect(disableEvent('campaign-123', 'event-1')).rejects.toThrow()
      expect(error.value).toBe('Failed to disable event')
    })
  })

  describe('fetchActiveInstances', () => {
    it('should fetch active instances', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [mockInstance] }),
      })

      const { fetchActiveInstances } = useGamification()

      const result = await fetchActiveInstances('campaign-123')

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3333/mj/campaigns/campaign-123/gamification/instances',
        { credentials: 'include' }
      )
      expect(result).toEqual([mockInstance])
    })

    it('should handle fetch error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
      })

      const { fetchActiveInstances } = useGamification()

      await expect(fetchActiveInstances('campaign-123')).rejects.toThrow()
    })
  })

  describe('cancelInstance', () => {
    it('should cancel an instance', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
      })

      const { cancelInstance } = useGamification()

      await cancelInstance('campaign-123', 'instance-1')

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3333/mj/campaigns/campaign-123/gamification/instances/instance-1/cancel',
        { method: 'POST', credentials: 'include' }
      )
    })

    it('should clear activeInstance if cancelled instance matches', async () => {
      // First, trigger to set activeInstance
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockInstance }),
        })
        .mockResolvedValueOnce({
          ok: true,
        })

      const { activeInstance, triggerEvent, cancelInstance } = useGamification()
      await triggerEvent('campaign-123', 'event-1')
      expect(activeInstance.value).not.toBeNull()

      await cancelInstance('campaign-123', 'instance-1')
      expect(activeInstance.value).toBeNull()
    })
  })

  describe('triggerEvent', () => {
    it('should trigger an event and set activeInstance', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockInstance }),
      })

      const { activeInstance, triggerEvent } = useGamification()

      const result = await triggerEvent('campaign-123', 'event-1')

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3333/mj/campaigns/campaign-123/gamification/trigger',
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId: 'event-1' }),
        }
      )
      expect(result).toEqual(mockInstance)
      expect(activeInstance.value).toEqual(mockInstance)
    })

    it('should include optional data in trigger request', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockInstance }),
      })

      const { triggerEvent } = useGamification()

      await triggerEvent('campaign-123', 'event-1', {
        streamerId: 'streamer-1',
        viewerCount: 100,
        customData: { key: 'value' },
      })

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3333/mj/campaigns/campaign-123/gamification/trigger',
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId: 'event-1',
            streamerId: 'streamer-1',
            viewerCount: 100,
            customData: { key: 'value' },
          }),
        }
      )
    })

    it('should handle trigger error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Cooldown not expired' }),
      })

      const { error, triggerEvent } = useGamification()

      await expect(triggerEvent('campaign-123', 'event-1')).rejects.toThrow('Cooldown not expired')
      expect(error.value).toBe('Cooldown not expired')
    })
  })

  describe('checkCooldown', () => {
    it('should check cooldown status', async () => {
      const cooldownStatus = {
        isOnCooldown: true,
        remainingSeconds: 120,
        lastTriggeredAt: '2024-01-15T09:55:00Z',
      }

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: cooldownStatus }),
      })

      const { checkCooldown } = useGamification()

      const result = await checkCooldown('campaign-123', 'event-1')

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3333/mj/campaigns/campaign-123/gamification/events/event-1/cooldown',
        { credentials: 'include' }
      )
      expect(result).toEqual(cooldownStatus)
    })

    it('should include streamerId in query if provided', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { isOnCooldown: false } }),
      })

      const { checkCooldown } = useGamification()

      await checkCooldown('campaign-123', 'event-1', 'streamer-1')

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3333/mj/campaigns/campaign-123/gamification/events/event-1/cooldown?streamerId=streamer-1',
        { credentials: 'include' }
      )
    })
  })

  describe('resetCooldowns', () => {
    it('should return count 0 (not implemented)', async () => {
      const { resetCooldowns } = useGamification()

      const result = await resetCooldowns('campaign-123')

      expect(result).toEqual({ count: 0 })
    })
  })

  describe('forceCompleteInstance', () => {
    it('should force complete an instance', async () => {
      const completedInstance: GamificationInstance = {
        ...mockInstance,
        status: 'completed',
        resultData: { success: true },
      }

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: completedInstance }),
      })

      const { forceCompleteInstance } = useGamification()

      const result = await forceCompleteInstance('campaign-123', 'instance-1')

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3333/mj/campaigns/campaign-123/gamification/instances/instance-1/force-complete',
        { method: 'POST', credentials: 'include' }
      )
      expect(result).toEqual(completedInstance)
    })

    it('should handle force complete error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Instance not found' }),
      })

      const { forceCompleteInstance } = useGamification()

      await expect(forceCompleteInstance('campaign-123', 'instance-1')).rejects.toThrow(
        'Instance not found'
      )
    })
  })

  describe('clearError', () => {
    it('should clear error state', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
      })

      const { error, fetchEvents, clearError } = useGamification()

      await expect(fetchEvents()).rejects.toThrow()
      expect(error.value).not.toBeNull()

      clearError()
      expect(error.value).toBeNull()
    })
  })

  describe('getConfigForEvent', () => {
    it('should return config for a specific event', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockConfigs }),
      })

      const { fetchCampaignConfigs, getConfigForEvent } = useGamification()
      await fetchCampaignConfigs('campaign-123')

      const config = getConfigForEvent('event-1')

      expect(config).toEqual(mockConfigs[0])
    })

    it('should return undefined for non-existent event', () => {
      const { getConfigForEvent } = useGamification()

      const config = getConfigForEvent('non-existent')

      expect(config).toBeUndefined()
    })
  })
})
