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

    // Allow ALL origins for Foundry VTT webhooks
    // These endpoints use API key authentication, so CORS is not needed for security
    // Foundry can run on any host (localhost, cloud, self-hosted, etc.)
    const url = ctx.request.url()
    if (url.startsWith('/webhooks/foundry')) {
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
