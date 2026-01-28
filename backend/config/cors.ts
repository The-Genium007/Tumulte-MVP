import { defineConfig } from '@adonisjs/cors'
import env from '#start/env'

/**
 * Configuration options to tweak the CORS policy. The following
 * options are documented on the official documentation website.
 *
 * https://docs.adonisjs.com/guides/security/cors
 */
const corsConfig = defineConfig({
  enabled: true,
  origin: (origin: string, ctx) => {
    const allowedOrigins = [env.get('FRONTEND_URL')].filter(Boolean)

    // Allow frontend URL
    if (allowedOrigins.includes(origin)) {
      return true
    }

    // Allow ALL origins for Foundry VTT endpoints
    // These endpoints use their own authentication (API key or JWT)
    // Foundry can run on any host (localhost, cloud, self-hosted, etc.)
    const url = ctx.request.url()

    // Foundry webhooks (API key auth)
    if (url.startsWith('/webhooks/foundry')) {
      return true
    }

    // VTT token refresh endpoint (JWT auth with fingerprint validation)
    // This endpoint is called by the Foundry module to refresh session tokens
    if (url === '/mj/vtt-connections/refresh-token') {
      return true
    }

    return false
  },
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
  headers: true,
  exposeHeaders: [],
  credentials: true,
  maxAge: 90,
})

export default corsConfig
