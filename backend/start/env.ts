/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  APP_KEY: Env.schema.string(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']),

  /*
  |----------------------------------------------------------
  | Variables for configuring database connection
  |----------------------------------------------------------
  */
  DB_HOST: Env.schema.string({ format: 'host' }),
  DB_PORT: Env.schema.number(),
  DB_USER: Env.schema.string(),
  DB_PASSWORD: Env.schema.string.optional(),
  DB_DATABASE: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for configuring session package
  |----------------------------------------------------------
  */
  SESSION_DRIVER: Env.schema.enum(['cookie', 'memory'] as const),

  /*
  |----------------------------------------------------------
  | Variables for configuring Redis
  |----------------------------------------------------------
  */
  REDIS_CONNECTION: Env.schema.string.optional(),
  REDIS_HOST: Env.schema.string({ format: 'host' }),
  REDIS_PORT: Env.schema.number(),
  REDIS_PASSWORD: Env.schema.string.optional(),
  REDIS_DB: Env.schema.number.optional(),

  /*
  |----------------------------------------------------------
  | Variables for configuring Sentry
  |----------------------------------------------------------
  */
  SENTRY_DSN: Env.schema.string.optional(),
  APP_VERSION: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------
  | Discord support / Tickets (2 webhooks séparés)
  |----------------------------------------------------------
  */
  DISCORD_SUPPORT_WEBHOOK_URL: Env.schema.string.optional(),
  DISCORD_SUGGESTIONS_WEBHOOK_URL: Env.schema.string.optional(),
  DISCORD_SUPPORT_ROLE_ID: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------
  | GitHub (Issues pour bugs, Discussions pour suggestions)
  |----------------------------------------------------------
  */
  GITHUB_TOKEN: Env.schema.string.optional(),
  GITHUB_REPO: Env.schema.string.optional(),
  GITHUB_DISCUSSION_CATEGORY_ID: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------
  | Variables for configuring Twitch OAuth
  |----------------------------------------------------------
  */
  TWITCH_CLIENT_ID: Env.schema.string(),
  TWITCH_CLIENT_SECRET: Env.schema.string(),
  TWITCH_REDIRECT_URI: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Frontend URL (for CORS and redirects)
  |----------------------------------------------------------
  */
  FRONTEND_URL: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Push Notifications (VAPID)
  |----------------------------------------------------------
  */
  VAPID_PUBLIC_KEY: Env.schema.string.optional(),
  VAPID_PRIVATE_KEY: Env.schema.string.optional(),
  VAPID_SUBJECT: Env.schema.string.optional(),
})
