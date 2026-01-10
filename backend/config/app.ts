import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { Secret } from '@adonisjs/core/helpers'
import { defineConfig } from '@adonisjs/core/http'

/**
 * The app key is used for encrypting cookies, generating signed URLs,
 * and by the "encryption" module.
 *
 * The encryption module will fail to decrypt data if the key is lost or
 * changed. Therefore it is recommended to keep the app key secure.
 */
export const appKey = new Secret(env.get('APP_KEY'))

/**
 * The configuration settings used by the HTTP server
 */
export const http = defineConfig({
  generateRequestId: true,
  allowMethodSpoofing: false,

  /**
   * Enabling async local storage will let you access HTTP context
   * from anywhere inside your application.
   */
  useAsyncLocalStorage: false,

  /**
   * Manage cookies configuration. The settings for the session id cookie are
   * defined inside the "config/session.ts" file.
   *
   * Note: sameSite 'none' is required for cross-origin requests with credentials
   * when frontend and backend are on different domains (e.g., staging environment)
   */
  cookie: {
    domain: '',
    path: '/',
    maxAge: '7 days',
    httpOnly: true,
    secure: app.inProduction,
    sameSite: app.inProduction ? 'none' : 'lax',
  },
})
