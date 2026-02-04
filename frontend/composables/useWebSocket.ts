import { ref, readonly } from 'vue'
import type {
  PollStartEvent,
  PollUpdateEvent,
  PollEndEvent,
  ReadinessChangeEvent,
  PreviewCommandEvent,
  DiceRollEvent,
  GamificationInstanceEvent,
  GamificationProgressEvent,
  GamificationCompleteEvent,
  GamificationActionExecutedEvent,
} from '@/types'
import { loggers } from '@/utils/logger'

/**
 * Configuration de reconnexion
 */
const RECONNECT_CONFIG = {
  initialDelay: 1000, // 1 seconde
  maxDelay: 30000, // 30 secondes max
  backoffMultiplier: 2,
  maxAttempts: 10, // Après 10 tentatives, on attend une action utilisateur
}

/**
 * Client SSE natif pour remplacer @adonisjs/transmit-client
 * Avec reconnexion automatique robuste
 */
class NativeSSEClient {
  private eventSource: EventSource | null = null
  private subscriptions: Map<string, Array<(message: { event: string; data: unknown }) => void>> =
    new Map()
  private activeChannels: Set<string> = new Set()
  private baseUrl: string
  private uid: string
  private isConnected = false
  private isReconnecting = false
  private reconnectAttempts = 0
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null
  private onReconnectCallback: (() => void) | null = null
  private onDisconnectCallback: (() => void) | null = null

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
    // Générer un UID unique pour ce client
    this.uid = crypto.randomUUID()
    loggers.ws.debug(`Client created with UID: ${this.uid}`)
  }

  /**
   * Définir le callback appelé après une reconnexion réussie
   */
  onReconnect(callback: () => void) {
    this.onReconnectCallback = callback
  }

  /**
   * Définir le callback appelé lors d'une déconnexion
   */
  onDisconnect(callback: () => void) {
    this.onDisconnectCallback = callback
  }

  /**
   * Obtenir l'état de connexion
   */
  getConnectionState(): {
    connected: boolean
    reconnecting: boolean
    attempts: number
  } {
    return {
      connected: this.isConnected,
      reconnecting: this.isReconnecting,
      attempts: this.reconnectAttempts,
    }
  }

  /**
   * Calculer le délai de reconnexion avec backoff exponentiel
   */
  private getReconnectDelay(): number {
    const delay = Math.min(
      RECONNECT_CONFIG.initialDelay *
        Math.pow(RECONNECT_CONFIG.backoffMultiplier, this.reconnectAttempts),
      RECONNECT_CONFIG.maxDelay
    )
    return delay
  }

  /**
   * Planifier une reconnexion
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
    }

    if (this.reconnectAttempts >= RECONNECT_CONFIG.maxAttempts) {
      loggers.ws.error(
        `Max reconnection attempts (${RECONNECT_CONFIG.maxAttempts}) reached. Stopping auto-reconnect.`
      )
      this.isReconnecting = false
      return
    }

    const delay = this.getReconnectDelay()
    this.reconnectAttempts++
    this.isReconnecting = true

    loggers.ws.warn(
      `Scheduling reconnection attempt ${this.reconnectAttempts}/${RECONNECT_CONFIG.maxAttempts} in ${delay}ms`
    )

    this.reconnectTimeout = setTimeout(async () => {
      try {
        await this.reconnect()
      } catch (error) {
        loggers.ws.error(`Reconnection attempt failed:`, error)
        this.scheduleReconnect()
      }
    }, delay)
  }

  /**
   * Reconnecter et ré-abonner aux channels actifs
   */
  private async reconnect(): Promise<void> {
    loggers.ws.info(`========== RECONNECTING ==========`)
    loggers.ws.info(`Attempt: ${this.reconnectAttempts}`)
    loggers.ws.info(`Active channels to restore: ${this.activeChannels.size}`)

    // Fermer l'ancienne connexion proprement
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }

    // Établir une nouvelle connexion
    await this.connectInternal()

    // Ré-abonner à tous les channels actifs
    const channelsToRestore = Array.from(this.activeChannels)
    for (const channel of channelsToRestore) {
      try {
        await this.subscribeToChannel(channel)
        loggers.ws.info(`Restored subscription to channel: ${channel}`)
      } catch (error) {
        loggers.ws.error(`Failed to restore subscription to channel ${channel}:`, error)
      }
    }

    // Réinitialiser les compteurs
    this.reconnectAttempts = 0
    this.isReconnecting = false

    loggers.ws.info(`Reconnection successful! ${channelsToRestore.length} channels restored.`)

    // Notifier les composants
    if (this.onReconnectCallback) {
      this.onReconnectCallback()
    }
  }

  /**
   * Établir la connexion SSE globale (une seule pour tous les canaux)
   */
  private async connect(): Promise<void> {
    if (this.eventSource && this.isConnected) {
      loggers.ws.debug('Already connected')
      return
    }

    return this.connectInternal()
  }

  /**
   * Logique interne de connexion SSE
   */
  private async connectInternal(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `${this.baseUrl}/__transmit/events?uid=${encodeURIComponent(this.uid)}`

      loggers.ws.debug(`========== CONNECTING TO SSE ==========`)
      loggers.ws.debug(`UID: ${this.uid}`)
      loggers.ws.debug(`URL: ${url}`)

      this.eventSource = new EventSource(url, {
        withCredentials: true,
      })

      this.eventSource.addEventListener('open', () => {
        loggers.ws.debug(`SSE connection opened`)
        loggers.ws.debug(`EventSource readyState: ${this.eventSource?.readyState}`)
        this.isConnected = true
        this.isReconnecting = false
        this.reconnectAttempts = 0
        resolve()
      })

      this.eventSource.addEventListener('error', (error) => {
        loggers.ws.error(`SSE connection error:`, error)
        loggers.ws.error(`EventSource readyState: ${this.eventSource?.readyState}`)

        if (this.eventSource && this.eventSource.readyState === EventSource.CLOSED) {
          loggers.ws.error(`Connection CLOSED - SSE stream ended`)
          const wasConnected = this.isConnected
          this.isConnected = false

          // Notifier la déconnexion
          if (wasConnected && this.onDisconnectCallback) {
            this.onDisconnectCallback()
          }

          // Si on était connecté avant, tenter de reconnecter
          if (wasConnected && !this.isReconnecting) {
            this.scheduleReconnect()
          } else if (!wasConnected) {
            // Première connexion échouée
            reject(error)
          }
        } else if (this.eventSource && this.eventSource.readyState === EventSource.CONNECTING) {
          loggers.ws.warn(`EventSource attempting native reconnect...`)
        }
      })

      // Écouter TOUS les messages SSE (tous les canaux)
      this.eventSource.addEventListener('message', (event) => {
        try {
          loggers.ws.debug(`Raw SSE message received:`, event.data)
          const parsed = JSON.parse(event.data)
          loggers.ws.debug(`Parsed SSE message:`, parsed)

          // Format Transmit: { channel: string, payload: { event: string, data: unknown } }
          const { channel, payload } = parsed

          if (!channel || !payload) {
            loggers.ws.warn(`Invalid message format (missing channel or payload):`, parsed)
            return
          }

          loggers.ws.debug(`Message for channel "${channel}":`, payload)

          // Distribuer le message aux handlers de ce canal
          const handlers = this.subscriptions.get(channel)
          if (handlers && handlers.length > 0) {
            loggers.ws.debug(
              `Dispatching to ${handlers.length} handler(s) for channel "${channel}"`
            )
            handlers.forEach((handler) => {
              handler(payload)
            })
          } else {
            loggers.ws.warn(`No handlers registered for channel "${channel}"`)
          }
        } catch (error) {
          loggers.ws.error(`Failed to parse SSE message:`, error, event.data)
        }
      })
    })
  }

  /**
   * Forcer une reconnexion manuelle (réinitialise le compteur)
   */
  async forceReconnect(): Promise<void> {
    loggers.ws.info(`Force reconnect requested`)
    this.reconnectAttempts = 0

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    await this.reconnect()
  }

  /**
   * S'abonner à un canal spécifique via POST /__transmit/subscribe
   */
  private async subscribeToChannel(channel: string): Promise<void> {
    loggers.ws.debug(`Subscribing to channel via HTTP: ${channel}`)

    try {
      const response = await fetch(`${this.baseUrl}/__transmit/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          uid: this.uid,
          channel: channel,
        }),
      })

      loggers.ws.debug(`Subscribe response status: ${response.status}`)

      if (!response.ok) {
        const text = await response.text()
        loggers.ws.error(`Failed to subscribe to channel "${channel}":`, text)
        throw new Error(`Subscribe failed: ${response.status} ${text}`)
      }

      // Tracker le channel pour la reconnexion
      this.activeChannels.add(channel)
      loggers.ws.debug(`Successfully subscribed to channel "${channel}"`)
    } catch (error) {
      loggers.ws.error(`Error subscribing to channel "${channel}":`, error)
      throw error
    }
  }

  /**
   * Se désabonner d'un canal via POST /__transmit/unsubscribe
   */
  private async unsubscribeFromChannel(channel: string): Promise<void> {
    loggers.ws.debug(`Unsubscribing from channel: ${channel}`)

    // Retirer du tracking même si l'API échoue
    this.activeChannels.delete(channel)

    try {
      const response = await fetch(`${this.baseUrl}/__transmit/unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          uid: this.uid,
          channel: channel,
        }),
      })

      if (!response.ok) {
        loggers.ws.error(`Failed to unsubscribe from channel "${channel}"`)
      } else {
        loggers.ws.debug(`Successfully unsubscribed from channel "${channel}"`)
      }
    } catch (error) {
      loggers.ws.error(`Error unsubscribing from channel "${channel}":`, error)
    }
  }

  /**
   * Créer une souscription à un canal SSE
   */
  subscription(channel: string) {
    const messageHandlers: Array<(message: { event: string; data: unknown }) => void> = []

    return {
      /**
       * Enregistrer un handler pour les messages
       */
      onMessage(handler: (message: { event: string; data: unknown }) => void) {
        messageHandlers.push(handler)
      },

      /**
       * Créer la connexion SSE et s'abonner au canal
       */
      create: async () => {
        loggers.ws.debug(`========== CREATING SUBSCRIPTION ==========`)
        loggers.ws.debug(`Channel: ${channel}`)

        // 1. S'assurer que la connexion SSE globale est établie
        if (!this.isConnected) {
          loggers.ws.debug(`SSE not connected yet, establishing connection...`)
          await this.connect()
        }

        // 2. Enregistrer les handlers pour ce canal
        if (!this.subscriptions.has(channel)) {
          this.subscriptions.set(channel, [])
        }
        this.subscriptions.get(channel)!.push(...messageHandlers)
        loggers.ws.debug(`Registered ${messageHandlers.length} handler(s) for channel "${channel}"`)

        // 3. S'abonner au canal via POST /__transmit/subscribe
        await this.subscribeToChannel(channel)

        loggers.ws.debug(`Subscription created successfully for channel "${channel}"`)
      },

      /**
       * Fermer l'abonnement au canal
       */
      delete: async () => {
        loggers.ws.debug(`Deleting subscription for channel: ${channel}`)

        // 1. Se désabonner du canal
        await this.unsubscribeFromChannel(channel)

        // 2. Retirer les handlers
        this.subscriptions.delete(channel)
      },
    }
  }

  /**
   * Fermer toutes les connexions
   */
  shutdown() {
    loggers.ws.debug(`Shutting down client`)

    // Annuler toute reconnexion en cours
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    // Fermer toutes les souscriptions
    this.subscriptions.clear()
    this.activeChannels.clear()

    // Fermer l'EventSource
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
      this.isConnected = false
    }

    this.isReconnecting = false
    this.reconnectAttempts = 0
  }
}

/**
 * Composable pour gérer les connexions WebSocket/SSE avec le backend
 */
export const useWebSocket = () => {
  const config = useRuntimeConfig()
  const API_URL = config.public.apiBase

  const connected = ref(false)
  const reconnecting = ref(false)
  const reconnectAttempts = ref(0)
  const client = ref<NativeSSEClient | null>(null)

  /**
   * Initialiser la connexion SSE
   */
  const connect = () => {
    if (client.value) {
      loggers.ws.debug('Already connected')
      return
    }

    loggers.ws.debug(`Initializing client with URL: ${API_URL}`)
    client.value = new NativeSSEClient(API_URL)

    // Configurer les callbacks de reconnexion
    client.value.onDisconnect(() => {
      connected.value = false
      const state = client.value?.getConnectionState()
      reconnecting.value = state?.reconnecting ?? false
      reconnectAttempts.value = state?.attempts ?? 0
      loggers.ws.warn('WebSocket disconnected, reconnecting...')
    })

    client.value.onReconnect(() => {
      connected.value = true
      reconnecting.value = false
      reconnectAttempts.value = 0
      loggers.ws.info('WebSocket reconnected successfully!')
    })

    connected.value = true
    loggers.ws.debug('Client initialized')
  }

  /**
   * Forcer une reconnexion manuelle
   */
  const forceReconnect = async () => {
    if (client.value) {
      await client.value.forceReconnect()
    }
  }

  /**
   * Obtenir l'état de connexion détaillé
   */
  const getConnectionState = () => {
    if (!client.value) {
      return { connected: false, reconnecting: false, attempts: 0 }
    }
    return client.value.getConnectionState()
  }

  /**
   * S'abonner aux événements d'un poll spécifique
   */
  const subscribeToPoll = (
    pollInstanceId: string,
    callbacks: {
      onStart?: (data: PollStartEvent) => void
      onUpdate?: (data: PollUpdateEvent) => void
      onEnd?: (data: PollEndEvent) => void
    }
  ): (() => Promise<void>) => {
    loggers.ws.debug('========== SUBSCRIBING TO POLL ==========')
    loggers.ws.debug('pollInstanceId:', pollInstanceId)
    loggers.ws.debug('client.value exists:', !!client.value)
    loggers.ws.debug('callbacks:', {
      hasOnStart: !!callbacks.onStart,
      hasOnUpdate: !!callbacks.onUpdate,
      hasOnEnd: !!callbacks.onEnd,
    })

    if (!client.value) {
      loggers.ws.debug('Client not initialized, connecting...')
      connect()
      loggers.ws.debug('Connected, client.value:', !!client.value)
    }

    const channel = `poll:${pollInstanceId}`
    loggers.ws.debug(`Subscribing to channel: ${channel}`)
    loggers.ws.debug('API_URL:', API_URL)

    let subscription
    try {
      loggers.ws.debug('About to call client.value!.subscription()...')
      subscription = client.value!.subscription(channel)
      loggers.ws.debug('Subscription object created:', !!subscription)
    } catch (error) {
      loggers.ws.error('Failed to create subscription:', error)
      loggers.ws.error('Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        clientExists: !!client.value,
        channel,
      })
      loggers.ws.error('WebSocket subscribe error:', error)
      throw error
    }

    // Enregistrer le listener AVANT de créer la subscription
    loggers.ws.debug('Registering onMessage listener...')
    subscription.onMessage((message: { event: string; data: unknown }) => {
      loggers.ws.debug(`Message received on ${channel}:`, message)

      switch (message.event) {
        case 'poll:start':
          loggers.ws.debug(`Calling onStart callback`)
          if (callbacks.onStart) {
            callbacks.onStart(message.data as PollStartEvent)
          } else {
            loggers.ws.warn(`No onStart callback defined`)
          }
          break
        case 'poll:update':
          loggers.ws.debug(`Calling onUpdate callback`)
          if (callbacks.onUpdate) {
            callbacks.onUpdate(message.data as PollUpdateEvent)
          } else {
            loggers.ws.warn(`No onUpdate callback defined`)
          }
          break
        case 'poll:end':
          loggers.ws.debug(`*** POLL:END EVENT DETECTED IN COMPOSABLE ***`)
          loggers.ws.debug(`Has onEnd callback:`, !!callbacks.onEnd)
          if (callbacks.onEnd) {
            loggers.ws.debug(`Calling onEnd callback now...`)
            callbacks.onEnd(message.data as PollEndEvent)
            loggers.ws.debug(`onEnd callback completed`)
          } else {
            loggers.ws.error(`ERROR: No onEnd callback defined!`)
          }
          break
        default:
          loggers.ws.warn(`Unknown event type: ${message.event}`)
      }
    })

    loggers.ws.debug('onMessage listener registered')

    // Créer la connexion SSE (après avoir enregistré le listener) - ASYNC!
    subscription
      .create()
      .then(() => {
        loggers.ws.debug(`Subscription created for channel: ${channel}`)
        loggers.ws.debug('Subscription.create() called successfully - ready to receive messages')
      })
      .catch((error: unknown) => {
        loggers.ws.error(`Failed to create subscription for channel ${channel}:`, error)
        loggers.ws.error('WebSocket connect error:', error)
      })

    // Retourner une fonction de nettoyage asynchrone
    return async () => {
      loggers.ws.debug(`Unsubscribing from channel: ${channel}`)
      await subscription.delete()
    }
  }

  /**
   * S'abonner aux événements d'un streamer (pour les polls de sa campagne)
   */
  const subscribeToStreamerPolls = (
    streamerId: string,
    callbacks: {
      onPollStart?: (data: PollStartEvent) => void
      onPollUpdate?: (data: PollUpdateEvent) => void
      onPollEnd?: (data: PollEndEvent) => void

      onJoinedCampaign?: (data: { campaign_id: string }) => void

      onLeftCampaign?: (data: { campaign_id: string }) => void
      onPreviewCommand?: (data: PreviewCommandEvent) => void
      onDiceRoll?: (data: DiceRollEvent) => void
      onDiceRollCritical?: (data: DiceRollEvent) => void
      // Gamification events
      onGamificationStart?: (data: GamificationInstanceEvent) => void
      onGamificationProgress?: (data: GamificationProgressEvent) => void
      onGamificationComplete?: (data: GamificationCompleteEvent) => void
      onGamificationExpired?: (data: { instanceId: string }) => void
      onGamificationActionExecuted?: (data: GamificationActionExecutedEvent) => void
    }
  ): (() => Promise<void>) => {
    if (!client.value) {
      connect()
    }

    const channel = `streamer:${streamerId}:polls`
    loggers.ws.debug(`Subscribing to streamer channel: ${channel}`)

    const subscription = client.value!.subscription(channel)

    subscription.onMessage((message: { event: string; data: unknown }) => {
      loggers.ws.debug(`Message received on ${channel}:`, message)

      switch (message.event) {
        case 'poll:start':
          if (callbacks.onPollStart) {
            callbacks.onPollStart(message.data as PollStartEvent)
          }
          break
        case 'poll:update':
          if (callbacks.onPollUpdate) {
            callbacks.onPollUpdate(message.data as PollUpdateEvent)
          }
          break
        case 'poll:end':
          if (callbacks.onPollEnd) {
            callbacks.onPollEnd(message.data as PollEndEvent)
          }
          break
        case 'streamer:joined-campaign':
          if (callbacks.onJoinedCampaign) {
            callbacks.onJoinedCampaign(message.data as { campaign_id: string })
          }
          break
        case 'streamer:left-campaign':
          if (callbacks.onLeftCampaign) {
            callbacks.onLeftCampaign(message.data as { campaign_id: string })
          }
          break
        case 'preview:command':
          if (callbacks.onPreviewCommand) {
            callbacks.onPreviewCommand(message.data as PreviewCommandEvent)
          }
          break
        case 'dice-roll:new':
          if (callbacks.onDiceRoll) {
            callbacks.onDiceRoll(message.data as DiceRollEvent)
          }
          break
        case 'dice-roll:critical':
          if (callbacks.onDiceRollCritical) {
            callbacks.onDiceRollCritical(message.data as DiceRollEvent)
          }
          break
        // Gamification events
        case 'gamification:start':
          if (callbacks.onGamificationStart) {
            callbacks.onGamificationStart(message.data as GamificationInstanceEvent)
          }
          break
        case 'gamification:progress':
          if (callbacks.onGamificationProgress) {
            callbacks.onGamificationProgress(message.data as GamificationProgressEvent)
          }
          break
        case 'gamification:complete':
          if (callbacks.onGamificationComplete) {
            callbacks.onGamificationComplete(message.data as GamificationCompleteEvent)
          }
          break
        case 'gamification:expired':
          if (callbacks.onGamificationExpired) {
            callbacks.onGamificationExpired(message.data as { instanceId: string })
          }
          break
        case 'gamification:action_executed':
          if (callbacks.onGamificationActionExecuted) {
            callbacks.onGamificationActionExecuted(message.data as GamificationActionExecutedEvent)
          }
          break
        default:
          loggers.ws.warn(`Unknown event type: ${message.event}`)
      }
    })

    subscription
      .create()
      .then(() => {
        loggers.ws.debug(`Subscription created for streamer channel: ${channel}`)
      })
      .catch((error: unknown) => {
        loggers.ws.error(`Failed to create subscription for streamer channel ${channel}:`, error)
        loggers.ws.error('WebSocket subscribe error:', error)
      })

    return async () => {
      loggers.ws.debug(`Unsubscribing from channel: ${channel}`)
      await subscription.delete()
    }
  }

  /**
   * S'abonner aux événements de readiness d'une campagne
   * Utilisé pour la waiting list en temps réel
   */
  const subscribeToCampaignReadiness = (
    campaignId: string,
    callbacks: {
      onStreamerReady?: (data: ReadinessChangeEvent) => void
      onStreamerNotReady?: (data: ReadinessChangeEvent) => void
    }
  ): (() => Promise<void>) => {
    if (!client.value) {
      connect()
    }

    const channel = `campaign:${campaignId}:readiness`
    loggers.ws.debug(`Subscribing to readiness channel: ${channel}`)

    const subscription = client.value!.subscription(channel)

    subscription.onMessage((message: { event: string; data: unknown }) => {
      loggers.ws.debug(`Readiness message on ${channel}:`, message)

      switch (message.event) {
        case 'streamer:ready':
          if (callbacks.onStreamerReady) {
            callbacks.onStreamerReady(message.data as ReadinessChangeEvent)
          }
          break
        case 'streamer:not-ready':
          if (callbacks.onStreamerNotReady) {
            callbacks.onStreamerNotReady(message.data as ReadinessChangeEvent)
          }
          break
        default:
          loggers.ws.warn(`Unknown readiness event type: ${message.event}`)
      }
    })

    subscription
      .create()
      .then(() => {
        loggers.ws.debug(`Subscription created for readiness channel: ${channel}`)
      })
      .catch((error: unknown) => {
        loggers.ws.error(`Failed to create subscription for readiness channel ${channel}:`, error)
        loggers.ws.error('WebSocket subscribe error:', error)
      })

    return async () => {
      loggers.ws.debug(`Unsubscribing from readiness channel: ${channel}`)
      await subscription.delete()
    }
  }

  /**
   * Fermer toutes les connexions
   */
  const disconnect = () => {
    if (client.value) {
      loggers.ws.debug('Disconnecting...')
      client.value.shutdown()
      client.value = null
      connected.value = false
      reconnecting.value = false
      reconnectAttempts.value = 0
    }
  }

  return {
    // État de connexion
    connected: readonly(connected),
    reconnecting: readonly(reconnecting),
    reconnectAttempts: readonly(reconnectAttempts),

    // Méthodes
    connect,
    disconnect,
    forceReconnect,
    getConnectionState,

    // Subscriptions
    subscribeToPoll,
    subscribeToStreamerPolls,
    subscribeToCampaignReadiness,
  }
}
