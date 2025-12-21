import tmi from 'tmi.js'
import logger from '@adonisjs/core/services/logger'
import RedisService from '#services/cache/redis_service'

interface ChatPollClient {
  client: tmi.Client
  streamerId: string
  streamerLogin: string
  pollInstanceId: string
  optionsCount: number
  active: boolean
}

/**
 * Service pour gérer les sondages via le chat Twitch (fallback pour non-affiliés)
 */
export default class TwitchChatService {
  private clients: Map<string, ChatPollClient> = new Map()
  private redisService: RedisService
  private inMemoryVotes: Map<string, Record<string, number>> = new Map()

  constructor(redisService: RedisService) {
    this.redisService = redisService
  }

  /**
   * Connecte un client IRC pour un streamer et un poll
   */
  async connectToPoll(
    streamerId: string,
    streamerLogin: string,
    accessToken: string,
    pollInstanceId: string,
    optionsCount: number
  ): Promise<void> {
    const key = `${streamerId}:${pollInstanceId}`

    // Vérifier qu'il n'existe pas déjà
    if (this.clients.has(key)) {
      logger.warn(`IRC client already exists for ${key}`)
      return
    }

    // Créer le client tmi.js
    const client = new tmi.Client({
      options: { debug: false },
      connection: {
        reconnect: true,
        secure: true,
      },
      identity: {
        username: streamerLogin,
        password: `oauth:${accessToken}`,
      },
      channels: [streamerLogin],
    })

    // Stocker le client
    const chatClient: ChatPollClient = {
      client,
      streamerId,
      streamerLogin,
      pollInstanceId,
      optionsCount,
      active: true,
    }

    this.clients.set(key, chatClient)

    // Listener pour les messages
    client.on('message', async (channel, tags, message, self) => {
      if (self) return // Ignorer ses propres messages
      await this.handleMessage(channel, tags, message, chatClient)
    })

    // Listeners pour debugging
    client.on('connected', (address, port) => {
      logger.info({
        event: 'chat_client_connected',
        streamer_id: streamerId,
        poll_instance_id: pollInstanceId,
        address,
        port,
      })
    })

    client.on('disconnected', (reason) => {
      logger.warn({
        event: 'chat_client_disconnected',
        streamer_id: streamerId,
        poll_instance_id: pollInstanceId,
        reason,
      })
    })

    client.on('reconnect', () => {
      logger.info({
        event: 'chat_client_reconnecting',
        streamer_id: streamerId,
        poll_instance_id: pollInstanceId,
      })
    })

    // Connecter
    try {
      await client.connect()
      logger.info({
        event: 'chat_poll_started',
        poll_instance_id: pollInstanceId,
        streamer_id: streamerId,
        options_count: optionsCount,
      })
    } catch (error) {
      logger.error({
        event: 'chat_connection_failed',
        poll_instance_id: pollInstanceId,
        streamer_id: streamerId,
        error: error instanceof Error ? error.message : String(error),
      })
      this.clients.delete(key)
      throw error
    }
  }

  /**
   * Déconnecte et nettoie le client pour un streamer/poll
   */
  async disconnectFromPoll(streamerId: string, pollInstanceId: string): Promise<void> {
    const key = `${streamerId}:${pollInstanceId}`
    const chatClient = this.clients.get(key)

    if (!chatClient) {
      logger.warn(`No IRC client found for ${key}`)
      logger.warn({
        event: 'active_clients_list',
        active_keys: Array.from(this.clients.keys()),
        looking_for: key,
      })
      return
    }

    try {
      // Marquer comme inactif pour ignorer les futurs messages
      chatClient.active = false

      // Déconnecter IRC
      await chatClient.client.disconnect()

      // Supprimer de la map
      this.clients.delete(key)

      logger.info({
        event: 'chat_client_disconnected',
        streamer_id: streamerId,
        poll_instance_id: pollInstanceId,
      })
    } catch (error) {
      logger.error({
        event: 'chat_disconnect_failed',
        streamer_id: streamerId,
        poll_instance_id: pollInstanceId,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * Envoie un message dans le chat d'un streamer
   */
  async sendMessage(streamerId: string, message: string): Promise<void> {
    const chatClient = this.getClientByStreamerId(streamerId)
    if (!chatClient) {
      throw new Error(`No active IRC client for streamer ${streamerId}`)
    }

    const lines = message.split('\n')

    try {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        if (line.length === 0) continue

        await chatClient.client.say(`#${chatClient.streamerLogin}`, line)

        // Petit délai entre les messages pour éviter le rate limiting
        if (i < lines.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 50))
        }
      }
    } catch (error) {
      logger.error({
        event: 'chat_message_failed',
        streamer_id: streamerId,
        error: error instanceof Error ? error.message : String(error),
      })
      // Ne pas throw pour éviter de bloquer le reste du système
    }
  }

  /**
   * Handler pour les messages IRC reçus
   */
  private async handleMessage(
    channel: string,
    tags: tmi.ChatUserstate,
    message: string,
    chatClient: ChatPollClient
  ): Promise<void> {
    // Ignorer si le poll n'est plus actif
    if (!chatClient.active) return

    // Parser le message pour extraire le vote
    const optionIndex = this.parseVote(message, chatClient.optionsCount)
    if (optionIndex === null) return

    // Incrémenter le vote
    try {
      await this.incrementVote(chatClient.pollInstanceId, chatClient.streamerId, optionIndex)

      logger.debug({
        event: 'chat_vote_received',
        poll_instance_id: chatClient.pollInstanceId,
        streamer_id: chatClient.streamerId,
        option_index: optionIndex,
        username: tags.username,
      })
    } catch (error) {
      logger.error({
        event: 'chat_vote_increment_failed',
        poll_instance_id: chatClient.pollInstanceId,
        streamer_id: chatClient.streamerId,
        option_index: optionIndex,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * Parse un message de vote (1, 2, 3, etc.)
   * @returns Index de l'option (0-indexed) ou null si invalide
   */
  private parseVote(message: string, optionsCount: number): number | null {
    const trimmed = message.trim()

    // Regex strict : uniquement un chiffre
    const match = /^([0-9]+)$/.exec(trimmed)
    if (!match) return null

    const voteNumber = parseInt(match[1], 10)

    // Valider que c'est une option valide (1-indexed)
    if (voteNumber < 1 || voteNumber > optionsCount) return null

    // Retourner 0-indexed
    return voteNumber - 1
  }

  /**
   * Incrémente le compteur de votes dans Redis (avec fallback en mémoire)
   */
  private async incrementVote(
    pollInstanceId: string,
    streamerId: string,
    optionIndex: number
  ): Promise<void> {
    try {
      // Tentative Redis
      await this.redisService.incrementChatVote(pollInstanceId, streamerId, optionIndex)
    } catch (redisError) {
      logger.error({
        event: 'redis_error_fallback_memory',
        poll_instance_id: pollInstanceId,
        streamer_id: streamerId,
        error: redisError instanceof Error ? redisError.message : String(redisError),
      })

      // Fallback en mémoire
      const key = `${pollInstanceId}:${streamerId}`
      const votes = this.inMemoryVotes.get(key) || {}
      votes[optionIndex.toString()] = (votes[optionIndex.toString()] || 0) + 1
      this.inMemoryVotes.set(key, votes)
    }
  }

  /**
   * Récupère un client par streamerId (cherche dans tous les polls actifs)
   */
  private getClientByStreamerId(streamerId: string): ChatPollClient | null {
    for (const [key, client] of this.clients.entries()) {
      if (client.streamerId === streamerId && client.active) {
        return client
      }
    }
    return null
  }

  /**
   * Récupère les votes depuis Redis ou fallback mémoire
   */
  async getVotes(pollInstanceId: string, streamerId: string): Promise<Record<string, number>> {
    try {
      return await this.redisService.getChatVotes(pollInstanceId, streamerId)
    } catch (redisError) {
      logger.warn({
        event: 'redis_unavailable_using_memory',
        poll_instance_id: pollInstanceId,
        streamer_id: streamerId,
      })
      const key = `${pollInstanceId}:${streamerId}`
      return this.inMemoryVotes.get(key) || {}
    }
  }
}
