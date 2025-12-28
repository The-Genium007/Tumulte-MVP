import tmi from 'tmi.js'
import logger from '@adonisjs/core/services/logger'
import { redisService as RedisService } from '#services/cache/redis_service'
import { twitchAuthService as TwitchAuthService } from '#services/auth/twitch_auth_service'

interface ChatPollClient {
  client: tmi.Client
  streamerId: string
  streamerLogin: string
  pollInstanceId: string
  optionsCount: number
  pollType: 'STANDARD' | 'UNIQUE'
  active: boolean
}

/**
 * Service pour gérer les sondages via le chat Twitch (fallback pour non-affiliés)
 */
class TwitchChatService {
  private clients: Map<string, ChatPollClient> = new Map()
  private redisService: RedisService
  private inMemoryVotes: Map<string, Record<string, number>> = new Map()
  private twitchAuthService: InstanceType<typeof TwitchAuthService>

  constructor(redisService: RedisService) {
    this.redisService = redisService
    this.twitchAuthService = new TwitchAuthService()
  }

  /**
   * Valide et rafraîchit automatiquement le token d'accès si nécessaire
   * @returns Le token d'accès valide (potentiellement rafraîchi)
   */
  private async ensureValidAccessToken(streamerId: string): Promise<string> {
    const { streamer: streamerModel } = await import('#models/streamer')
    const streamer = await streamerModel.find(streamerId)

    if (!streamer) {
      throw new Error(`Streamer ${streamerId} not found`)
    }

    // Récupérer le token décrypté
    let accessToken = await streamer.getDecryptedAccessToken()

    // Valider le token
    const isValid = await this.twitchAuthService.validateToken(accessToken)

    if (!isValid) {
      logger.info({
        event: 'token_invalid_refreshing',
        streamer_id: streamerId,
        message: 'Access token invalid, attempting refresh',
      })

      try {
        // Récupérer le refresh token
        const refreshToken = await streamer.getDecryptedRefreshToken()

        if (!refreshToken) {
          throw new Error('No refresh token available')
        }

        // Rafraîchir le token
        const refreshedTokens = await this.twitchAuthService.refreshAccessToken(refreshToken)

        // Mettre à jour le streamer avec les nouveaux tokens
        await streamer.updateTokens(refreshedTokens.access_token, refreshedTokens.refresh_token)

        accessToken = refreshedTokens.access_token

        logger.info({
          event: 'token_refreshed_successfully',
          streamer_id: streamerId,
          message: 'Access token refreshed successfully',
        })
      } catch (error) {
        logger.error({
          event: 'token_refresh_failed',
          streamer_id: streamerId,
          error: error instanceof Error ? error.message : String(error),
        })
        throw new Error(
          `Failed to refresh access token for streamer ${streamerId}: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }

    return accessToken
  }

  /**
   * Connecte un client IRC pour un streamer et un poll
   */
  async connectToPoll(
    streamerId: string,
    streamerLogin: string,
    accessToken: string,
    pollInstanceId: string,
    optionsCount: number,
    pollType: 'STANDARD' | 'UNIQUE' = 'STANDARD'
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
      pollType,
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
        pollInstanceId: pollInstanceId,
        address,
        port,
      })
    })

    client.on('disconnected', (reason) => {
      logger.warn({
        event: 'chat_client_disconnected',
        streamer_id: streamerId,
        pollInstanceId: pollInstanceId,
        reason,
      })
    })

    client.on('reconnect', () => {
      logger.info({
        event: 'chat_client_reconnecting',
        streamer_id: streamerId,
        pollInstanceId: pollInstanceId,
      })
    })

    // Connecter
    try {
      await client.connect()
      logger.info({
        event: 'chat_poll_started',
        pollInstanceId: pollInstanceId,
        streamer_id: streamerId,
        optionsCount: optionsCount,
      })
    } catch (error) {
      logger.error({
        event: 'chat_connection_failed',
        pollInstanceId: pollInstanceId,
        streamer_id: streamerId,
        error: error instanceof Error ? error.message : String(error),
      })
      this.clients.delete(key)
      throw error
    }
  }

  /**
   * Démarre un sondage via le chat pour un streamer non-affilié
   */
  async startChatPoll(
    streamerId: string,
    pollInstanceId: string,
    title: string,
    options: string[],
    durationSeconds: number,
    pollType: 'STANDARD' | 'UNIQUE' = 'STANDARD'
  ): Promise<void> {
    // Récupérer les infos du streamer depuis la base
    const { streamer: streamerModel } = await import('#models/streamer')
    const streamer = await streamerModel.find(streamerId)

    if (!streamer) {
      throw new Error(`Streamer ${streamerId} not found`)
    }

    // Valider et rafraîchir le token si nécessaire
    const accessToken = await this.ensureValidAccessToken(streamerId)

    // Connecter le client IRC
    await this.connectToPoll(
      streamerId,
      streamer.twitchLogin,
      accessToken,
      pollInstanceId,
      options.length,
      pollType
    )

    // Envoyer le message d'annonce du sondage dans le chat
    const key = `${streamerId}:${pollInstanceId}`
    const chatClient = this.clients.get(key)

    if (chatClient && chatClient.client) {
      const pollMessage = `📊 SONDAGE: ${title} | Votez avec !1, !2, !3... (${durationSeconds}s)`
      const optionsMessage = options.map((opt, i) => `!${i + 1} = ${opt}`).join(' | ')

      try {
        await chatClient.client.say(streamer.twitchLogin, pollMessage)
        await chatClient.client.say(streamer.twitchLogin, optionsMessage)
        logger.info({
          message: 'Chat poll announcement sent',
          pollInstanceId,
          streamer_id: streamerId,
        })
      } catch (error) {
        logger.error({
          message: 'Failed to send chat poll announcement',
          pollInstanceId,
          streamer_id: streamerId,
          error: error instanceof Error ? error.message : String(error),
        })
      }
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
        activeKeys: Array.from(this.clients.keys()),
        lookingFor: key,
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
        pollInstanceId: pollInstanceId,
      })
    } catch (error) {
      logger.error({
        event: 'chat_disconnect_failed',
        streamer_id: streamerId,
        pollInstanceId: pollInstanceId,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * Envoie un message dans le chat d'un streamer (utilise le client existant ou en crée un temporaire)
   */
  async sendMessage(streamerId: string, message: string): Promise<void> {
    // Essayer d'utiliser un client existant
    const chatClient = this.getClientByStreamerId(streamerId)

    if (chatClient) {
      // Client existant trouvé, l'utiliser
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
      }
    } else {
      // Pas de client existant, envoyer via connexion temporaire
      await this.sendOneTimeMessage(streamerId, message)
    }
  }

  /**
   * Envoie un message ponctuel via une connexion IRC temporaire
   */
  private async sendOneTimeMessage(streamerId: string, message: string): Promise<void> {
    const { streamer: streamerModel } = await import('#models/streamer')
    const streamer = await streamerModel.find(streamerId)

    if (!streamer) {
      throw new Error(`Streamer ${streamerId} not found`)
    }

    // Valider et rafraîchir le token si nécessaire
    const accessToken = await this.ensureValidAccessToken(streamerId)

    // Créer un client temporaire
    const client = new tmi.Client({
      options: { debug: false },
      connection: {
        reconnect: false,
        secure: true,
      },
      identity: {
        username: streamer.twitchLogin,
        password: `oauth:${accessToken}`,
      },
      channels: [streamer.twitchLogin],
    })

    try {
      await client.connect()

      const lines = message.split('\n')
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.length > 0) {
          await client.say(streamer.twitchLogin, trimmed)
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
      }

      await client.disconnect()

      logger.debug({
        event: 'one_time_message_sent',
        streamer_id: streamerId,
        message,
      })
    } catch (error) {
      logger.error({
        event: 'one_time_message_failed',
        streamer_id: streamerId,
        error: error instanceof Error ? error.message : String(error),
      })

      try {
        await client.disconnect()
      } catch {
        // Ignorer les erreurs de déconnexion
      }
    }
  }

  /**
   * Handler pour les messages IRC reçus
   */
  private async handleMessage(
    _channel: string,
    tags: tmi.ChatUserstate,
    message: string,
    chatClient: ChatPollClient
  ): Promise<void> {
    // Ignorer si le poll n'est plus actif
    if (!chatClient.active) return

    // Parser le message pour extraire le vote
    const optionIndex = this.parseVote(message, chatClient.optionsCount)
    if (optionIndex === null) return

    const username = tags.username || 'anonymous'

    try {
      if (chatClient.pollType === 'UNIQUE') {
        // Mode vote UNIQUE (simple) - un seul vote par utilisateur
        const hasVoted = await this.redisService.hasUserVoted(
          chatClient.pollInstanceId,
          chatClient.streamerId,
          username
        )

        if (hasVoted) {
          // L'utilisateur a déjà voté - vérifier s'il change son vote
          const previousVote = await this.redisService.getUserVote(
            chatClient.pollInstanceId,
            chatClient.streamerId,
            username
          )

          if (previousVote !== null && previousVote !== optionIndex) {
            // Changement de vote
            await this.redisService.changeUserVote(
              chatClient.pollInstanceId,
              chatClient.streamerId,
              username,
              previousVote,
              optionIndex
            )

            logger.debug({
              event: 'chat_vote_changed',
              pollInstanceId: chatClient.pollInstanceId,
              streamer_id: chatClient.streamerId,
              username,
              oldOption: previousVote,
              newOption: optionIndex,
            })
          } else {
            // Même vote - ignorer
            logger.debug({
              event: 'chat_vote_duplicate_ignored',
              pollInstanceId: chatClient.pollInstanceId,
              streamer_id: chatClient.streamerId,
              username,
              optionIndex,
            })
          }
          return
        }

        // Premier vote de cet utilisateur
        await this.redisService.recordUserVote(
          chatClient.pollInstanceId,
          chatClient.streamerId,
          username,
          optionIndex
        )
        await this.incrementVote(chatClient.pollInstanceId, chatClient.streamerId, optionIndex)

        logger.debug({
          event: 'chat_vote_unique_received',
          pollInstanceId: chatClient.pollInstanceId,
          streamer_id: chatClient.streamerId,
          username,
          optionIndex,
        })
      } else {
        // Mode vote STANDARD (multiple) - votes illimités
        await this.incrementVote(chatClient.pollInstanceId, chatClient.streamerId, optionIndex)

        logger.debug({
          event: 'chat_vote_standard_received',
          pollInstanceId: chatClient.pollInstanceId,
          streamer_id: chatClient.streamerId,
          username,
          optionIndex,
        })
      }
    } catch (error) {
      logger.error({
        event: 'chat_vote_increment_failed',
        pollInstanceId: chatClient.pollInstanceId,
        streamer_id: chatClient.streamerId,
        username,
        optionIndex,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * Parse un message de vote (!1, !2, !3, etc. ou 1, 2, 3...)
   * @returns Index de l'option (0-indexed) ou null si invalide
   */
  private parseVote(message: string, optionsCount: number): number | null {
    const trimmed = message.trim()

    // Accepter les formats: !1, !2, !3 OU 1, 2, 3
    const match = /^!?([0-9]+)$/.exec(trimmed)
    if (!match) return null

    const voteNumber = Number.parseInt(match[1], 10)

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
        pollInstanceId: pollInstanceId,
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
    for (const [_key, client] of this.clients.entries()) {
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
        pollInstanceId: pollInstanceId,
        streamer_id: streamerId,
      })
      const key = `${pollInstanceId}:${streamerId}`
      return this.inMemoryVotes.get(key) || {}
    }
  }
}

export { TwitchChatService as twitchChatService }
