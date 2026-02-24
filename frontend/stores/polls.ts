import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Poll, PollInstance } from '~/types'
import { useAnalytics } from '@/composables/useAnalytics'

export const usePollsStore = defineStore('polls', () => {
  const config = useRuntimeConfig()
  const { track, setUserPropertiesOnce } = useAnalytics()
  const API_URL = config.public.apiBase

  // State
  const polls = ref<Poll[]>([])
  const activePollInstance = ref<PollInstance | null>(null)
  const lastLaunchedPollId = ref<string | null>(null)
  const lastPollEndedAt = ref<Date | null>(null)
  const loading = ref(false)
  const launching = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const hasActivePoll = computed(() => activePollInstance.value !== null)

  const sortedPolls = computed(() => {
    return [...polls.value].sort((a, b) => {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })
  })

  /**
   * Fetch all polls for a campaign
   */
  const fetchPolls = async (campaignId: string) => {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(`${API_URL}/mj/campaigns/${campaignId}/polls`, {
        credentials: 'include',
      })

      if (!response.ok) throw new Error('Failed to fetch polls')
      const data = await response.json()
      polls.value = data.data || []
      activePollInstance.value = data.activePollInstance || null
    } catch (err) {
      console.error('Failed to fetch polls:', err)
      error.value = 'Impossible de charger les sondages'
      polls.value = []
    } finally {
      loading.value = false
    }
  }

  /**
   * Create a new poll
   */
  const createPoll = async (
    campaignId: string,
    pollData: {
      question: string
      options: string[]
      type?: 'UNIQUE' | 'STANDARD'
      durationSeconds?: number
      channelPointsAmount?: number | null
    }
  ): Promise<Poll> => {
    // Vérifier si c'est le premier poll AVANT la création
    const isFirstPoll = polls.value.length === 0

    try {
      const response = await fetch(`${API_URL}/mj/campaigns/${campaignId}/polls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(pollData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create poll')
      }

      const data = await response.json()
      polls.value.unshift(data.data)

      // Track la création du poll
      if (isFirstPoll) {
        track('first_poll_created', {
          poll_id: data.data.id,
          campaign_id: campaignId,
          options_count: pollData.options.length, // eslint-disable-line camelcase
        })
        setUserPropertiesOnce({
          first_poll_created_at: new Date().toISOString(),
        })
      }

      return data.data
    } catch (err) {
      console.error('Failed to create poll:', err)
      throw err
    }
  }

  /**
   * Update an existing poll
   */
  const updatePoll = async (
    pollId: string,
    pollData: {
      question?: string
      options?: string[]
      type?: 'UNIQUE' | 'STANDARD'
      durationSeconds?: number
      channelPointsAmount?: number | null
    }
  ): Promise<Poll> => {
    try {
      const response = await fetch(`${API_URL}/mj/polls/${pollId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(pollData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update poll')
      }

      const data = await response.json()

      // Update in list
      const index = polls.value.findIndex((p) => p.id === pollId)
      if (index !== -1) {
        polls.value[index] = data.data
      }

      return data.data
    } catch (err) {
      console.error('Failed to update poll:', err)
      throw err
    }
  }

  /**
   * Delete a poll
   */
  const deletePoll = async (pollId: string): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/mj/polls/${pollId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete poll')
      }

      // Remove from list
      polls.value = polls.value.filter((p) => p.id !== pollId)
    } catch (err) {
      console.error('Failed to delete poll:', err)
      throw err
    }
  }

  /**
   * Launch a poll (creates a PollInstance from the Poll template)
   */
  const launchPoll = async (
    pollId: string
  ): Promise<{ pollInstance: PollInstance; pollId: string }> => {
    launching.value = true
    error.value = null
    try {
      const response = await fetch(`${API_URL}/mj/polls/${pollId}/launch`, {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        const errorData = await response.json()

        // Handle conflict (poll already running)
        if (response.status === 409) {
          activePollInstance.value = errorData.activePollInstance || null
          throw new Error(errorData.error || 'Un sondage est déjà en cours')
        }

        // Handle health check failure
        if (response.status === 503) {
          throw new Error(errorData.error || 'Les streamers ne sont pas prêts')
        }

        throw new Error(errorData.error || 'Failed to launch poll')
      }

      const data = await response.json()
      activePollInstance.value = data.data
      lastLaunchedPollId.value = data.pollId || pollId

      // Update lastLaunchedAt in the polls list
      const index = polls.value.findIndex((p) => p.id === pollId)
      const poll = index !== -1 ? polls.value[index] : null
      if (index !== -1 && poll) {
        polls.value[index] = {
          ...poll,
          lastLaunchedAt: new Date().toISOString(),
        }
      }

      // Track le premier lancement (activation milestone)
      const isFirstLaunch = !polls.value.some((p) => p.id !== pollId && p.lastLaunchedAt)
      if (isFirstLaunch) {
        track('first_poll_launched', {
          poll_id: pollId,
          poll_instance_id: data.data.id,
        })
        setUserPropertiesOnce({ first_poll_launched_at: new Date().toISOString() }) // eslint-disable-line camelcase
      }

      // Track le lancement du poll
      track('poll_launched', {
        poll_id: pollId,
        poll_instance_id: data.data.id,
        poll_question: poll?.question, // eslint-disable-line camelcase
        options_count: poll?.options?.length, // eslint-disable-line camelcase
        duration_seconds: poll?.durationSeconds, // eslint-disable-line camelcase
      })

      return { pollInstance: data.data, pollId: data.pollId || pollId }
    } catch (err) {
      console.error('Failed to launch poll:', err)
      // Track l'échec du lancement
      track('poll_launch_failed', {
        poll_id: pollId,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
      throw err
    } finally {
      launching.value = false
    }
  }

  /**
   * Cancel an active poll
   */
  const cancelPoll = async (pollInstanceId: string): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/mj/polls/${pollInstanceId}/cancel`, {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to cancel poll')
      }

      activePollInstance.value = null
    } catch (err) {
      console.error('Failed to cancel poll:', err)
      throw err
    }
  }

  /**
   * Clear active poll (when poll ends)
   */
  const clearActivePoll = () => {
    activePollInstance.value = null
  }

  /**
   * Mark that a poll has ended (triggers refresh in RecentEventsColumn)
   */
  const markPollEnded = () => {
    lastPollEndedAt.value = new Date()
  }

  /**
   * Set active poll instance (from WebSocket event)
   */
  const setActivePollInstance = (instance: PollInstance | null) => {
    activePollInstance.value = instance
    if (instance?.pollId) {
      lastLaunchedPollId.value = instance.pollId
    }
  }

  /**
   * Clear all polls
   */
  const clearPolls = () => {
    polls.value = []
    activePollInstance.value = null
    lastLaunchedPollId.value = null
    error.value = null
  }

  return {
    // State
    polls,
    activePollInstance,
    lastLaunchedPollId,
    lastPollEndedAt,
    loading,
    launching,
    error,

    // Computed
    hasActivePoll,
    sortedPolls,

    // Actions
    fetchPolls,
    createPoll,
    updatePoll,
    deletePoll,
    launchPoll,
    cancelPoll,
    clearActivePoll,
    markPollEnded,
    setActivePollInstance,
    clearPolls,
  }
})
