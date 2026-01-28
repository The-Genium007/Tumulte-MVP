import redis from '@adonisjs/redis/services/main'
import logger from '@adonisjs/core/services/logger'

/**
 * Session information stored in Redis
 */
export interface SessionInfo {
  sessionId: string
  userId: number
  userAgent?: string
  ipAddress?: string
  createdAt: string
  lastActivityAt: string
}

/**
 * Service for managing user sessions stored in Redis.
 * Enables features like:
 * - Logout from all devices (global logout)
 * - View active sessions
 * - Revoke specific sessions
 * - Session activity tracking
 */
export default class SessionService {
  /**
   * Prefix used by AdonisJS session store in Redis
   */
  private readonly sessionPrefix = 'adonis:session:'

  /**
   * Prefix for tracking user sessions (userId -> sessionIds mapping)
   */
  private readonly userSessionsPrefix = 'user:sessions:'

  /**
   * Register a session for a user (call after login)
   * This creates a mapping from userId to sessionId for later revocation
   */
  async registerSession(
    userId: number,
    sessionId: string,
    metadata?: { userAgent?: string; ipAddress?: string }
  ): Promise<void> {
    const key = `${this.userSessionsPrefix}${userId}`
    const sessionData: SessionInfo = {
      sessionId,
      userId,
      userAgent: metadata?.userAgent,
      ipAddress: metadata?.ipAddress,
      createdAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
    }

    // Store session info with 7 days TTL (matching session age)
    await redis.hset(key, sessionId, JSON.stringify(sessionData))
    await redis.expire(key, 7 * 24 * 60 * 60) // 7 days in seconds

    logger.debug({ userId, sessionId }, '[SessionService] Session registered')
  }

  /**
   * Update last activity timestamp for a session
   */
  async updateActivity(userId: number, sessionId: string): Promise<void> {
    const key = `${this.userSessionsPrefix}${userId}`
    const existing = await redis.hget(key, sessionId)

    if (existing) {
      const sessionData: SessionInfo = JSON.parse(existing)
      sessionData.lastActivityAt = new Date().toISOString()
      await redis.hset(key, sessionId, JSON.stringify(sessionData))
    }
  }

  /**
   * Get all active sessions for a user
   */
  async getActiveSessions(userId: number): Promise<SessionInfo[]> {
    const key = `${this.userSessionsPrefix}${userId}`
    const sessions = await redis.hgetall(key)

    if (!sessions) {
      return []
    }

    const sessionInfos: SessionInfo[] = []

    for (const [sessionId, data] of Object.entries(sessions)) {
      // Verify session still exists in AdonisJS session store
      const sessionExists = await redis.exists(`${this.sessionPrefix}${sessionId}`)

      if (sessionExists) {
        sessionInfos.push(JSON.parse(data as string))
      } else {
        // Clean up stale mapping
        await redis.hdel(key, sessionId)
      }
    }

    return sessionInfos.sort(
      (a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()
    )
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(userId: number, sessionId: string): Promise<boolean> {
    // Delete from AdonisJS session store
    const sessionDeleted = await redis.del(`${this.sessionPrefix}${sessionId}`)

    // Delete from user sessions mapping
    const mappingKey = `${this.userSessionsPrefix}${userId}`
    await redis.hdel(mappingKey, sessionId)

    logger.info({ userId, sessionId }, '[SessionService] Session revoked')

    return sessionDeleted > 0
  }

  /**
   * Revoke all sessions for a user (logout from all devices)
   * Useful after password change or security concern
   */
  async revokeAllSessions(userId: number, exceptSessionId?: string): Promise<number> {
    const key = `${this.userSessionsPrefix}${userId}`
    const sessions = await redis.hgetall(key)

    if (!sessions) {
      return 0
    }

    let revokedCount = 0
    const pipeline = redis.pipeline()

    for (const sessionId of Object.keys(sessions)) {
      // Skip current session if specified
      if (exceptSessionId && sessionId === exceptSessionId) {
        continue
      }

      // Queue deletion of AdonisJS session
      pipeline.del(`${this.sessionPrefix}${sessionId}`)
      // Queue deletion from user mapping
      pipeline.hdel(key, sessionId)
      revokedCount++
    }

    await pipeline.exec()

    logger.info(
      { userId, revokedCount, keptSession: exceptSessionId },
      '[SessionService] All sessions revoked'
    )

    return revokedCount
  }

  /**
   * Get count of active sessions for a user
   */
  async getSessionCount(userId: number): Promise<number> {
    const sessions = await this.getActiveSessions(userId)
    return sessions.length
  }

  /**
   * Clean up expired session mappings for a user
   * Called periodically or on login
   */
  async cleanupStaleSessions(userId: number): Promise<number> {
    const key = `${this.userSessionsPrefix}${userId}`
    const sessions = await redis.hgetall(key)

    if (!sessions) {
      return 0
    }

    let cleanedCount = 0

    for (const sessionId of Object.keys(sessions)) {
      const sessionExists = await redis.exists(`${this.sessionPrefix}${sessionId}`)

      if (!sessionExists) {
        await redis.hdel(key, sessionId)
        cleanedCount++
      }
    }

    if (cleanedCount > 0) {
      logger.debug({ userId, cleanedCount }, '[SessionService] Stale sessions cleaned up')
    }

    return cleanedCount
  }
}
