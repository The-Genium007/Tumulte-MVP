/*
|--------------------------------------------------------------------------
| HTTP server entrypoint
|--------------------------------------------------------------------------
|
| The "server.ts" file is the entrypoint for starting the AdonisJS HTTP
| server. Either you can run this file directly or use the "serve"
| command to run this file and monitor file changes
|
*/

// Initialize Sentry FIRST before any other imports to capture early errors
import '#config/sentry'

import 'reflect-metadata'
import { Ignitor, prettyPrintError } from '@adonisjs/core'
import type { RedisClientType } from 'redis'

/**
 * URL to the application root. AdonisJS need it to resolve
 * paths to file and directories for scaffolding commands
 */
const APP_ROOT = new URL('../', import.meta.url)

/**
 * The importer is used to import files in context of the
 * application.
 */
const IMPORTER = (filePath: string) => {
  if (filePath.startsWith('./') || filePath.startsWith('../')) {
    return import(new URL(filePath, APP_ROOT).href)
  }
  return import(filePath)
}

/**
 * Redis clients for Socket.IO adapter (Pub/Sub)
 * These are separate from the main Redis connection to avoid blocking
 */
let pubClient: RedisClientType | null = null
let subClient: RedisClientType | null = null

new Ignitor(APP_ROOT, { importer: IMPORTER })
  .tap((app) => {
    app.booting(async () => {
      await import('#start/env')
    })
    app.listen('SIGTERM', () => app.terminate())
    app.listenIf(app.managedByPm2, 'SIGINT', () => app.terminate())

    // Graceful shutdown: close Redis pub/sub clients
    app.terminating(async () => {
      console.log('[Socket.IO] Closing Redis pub/sub connections...')
      if (pubClient) {
        await pubClient.quit().catch(() => {})
      }
      if (subClient) {
        await subClient.quit().catch(() => {})
      }
      console.log('[Socket.IO] Redis connections closed')
    })

    // Initialize Socket.IO when server is ready
    app.ready(async () => {
      const { Server } = await import('socket.io')
      const { createAdapter } = await import('@socket.io/redis-adapter')
      const { createClient: createRedisClient } = await import('redis')
      const server = await app.container.make('server')
      const httpServer = server.getNodeServer()

      if (httpServer) {
        const env = await import('#start/env')

        // Redis configuration for Socket.IO adapter
        const redisConfig = {
          socket: {
            host: env.default.get('REDIS_HOST', 'localhost'),
            port: env.default.get('REDIS_PORT', 6379),
          },
          password: env.default.get('REDIS_PASSWORD') || undefined,
          database: env.default.get('REDIS_DB', 0),
        }

        // Create dedicated Redis clients for pub/sub (Socket.IO adapter)
        pubClient = createRedisClient(redisConfig) as RedisClientType
        subClient = pubClient.duplicate()

        // Connect both clients
        await Promise.all([pubClient.connect(), subClient.connect()])
        console.log('[Socket.IO] Redis pub/sub clients connected')

        const io = new Server(httpServer, {
          cors: {
            origin: env.default.get('FRONTEND_URL', 'http://localhost:3000'),
            methods: ['GET', 'POST'],
            credentials: true,
          },
          transports: ['websocket', 'polling'],
          // Redis adapter for horizontal scaling (multi-instance support)
          adapter: createAdapter(pubClient, subClient),
        })

        // Use the container singleton to ensure the same instance is used everywhere
        const vttWebSocketService = await app.container.make('vttWebSocketService')
        vttWebSocketService.setup(io)

        console.log('[Socket.IO] Server initialized with Redis adapter for horizontal scaling')
      }

      // Seed required reference data (must complete before cache warmup)
      import('#services/core/database_seeder')
        .then(async ({ default: databaseSeederModule }) => {
          const seeder = new databaseSeederModule()
          await seeder.seed()

          // Run cache warmup after seeding (non-blocking)
          const { default: CacheWarmer } = await import('#services/cache/cache_warmer')
          const cacheWarmer = new CacheWarmer()
          await cacheWarmer.warmup()

          // Run startup reconciliation to clean up orphaned rewards and stale data
          // This runs AFTER cache warmup to ensure all services are ready
          const { OrphanDetector } = await import('#services/cleanup/orphan_detector')
          const { TwitchRewardReconciler } =
            await import('#services/cleanup/twitch_reward_reconciler')
          const { CleanupAuditService } = await import('#services/cleanup/cleanup_audit_service')
          const { StartupReconciliationService } =
            await import('#services/cleanup/startup_reconciliation_service')
          const { StreamerGamificationConfigRepository } =
            await import('#repositories/streamer_gamification_config_repository')
          const { TwitchRewardService } = await import('#services/twitch/twitch_reward_service')

          const configRepo = new StreamerGamificationConfigRepository()
          const twitchRewardService = new TwitchRewardService()
          const auditService = new CleanupAuditService()
          const orphanDetector = new OrphanDetector(configRepo)
          const reconciler = new TwitchRewardReconciler(
            twitchRewardService,
            configRepo,
            auditService
          )
          const reconciliationService = new StartupReconciliationService(
            orphanDetector,
            reconciler,
            auditService
          )

          // Inject EventSub reconciler if available
          try {
            const { EventSubReconciler } = await import('#services/cleanup/eventsub_reconciler')
            const twitchEventSubService = await app.container.make('twitchEventSubService')
            const eventSubReconciler = new EventSubReconciler(configRepo, twitchEventSubService)
            reconciliationService.setEventSubReconciler(eventSubReconciler)
          } catch (error) {
            console.warn('[Startup] EventSub reconciler not available, skipping:', error)
          }

          return reconciliationService.reconcile()
        })
        .then((reconciliationResult) => {
          if (reconciliationResult) {
            console.log('[StartupReconciliation] Completed:', {
              orphansFound: reconciliationResult.orphanedRewardsFound,
              orphansCleaned: reconciliationResult.orphanedRewardsCleaned,
              phantomsFixed: reconciliationResult.phantomsFixed,
              eventSub: reconciliationResult.eventSubReconciliation
                ? {
                    checked: reconciliationResult.eventSubReconciliation.subscriptionsChecked,
                    recreated: reconciliationResult.eventSubReconciliation.missingRecreated,
                    orphansDeleted: reconciliationResult.eventSubReconciliation.orphanedDeleted,
                  }
                : 'skipped',
              durationMs: reconciliationResult.durationMs,
              errors: reconciliationResult.errors.length,
            })
          }
        })
        .catch((error) => {
          console.error('[Startup] Failed during seed/warmup/reconciliation:', error)
        })
    })
  })
  .httpServer()
  .start()
  .catch((error) => {
    process.exitCode = 1
    prettyPrintError(error)
  })
