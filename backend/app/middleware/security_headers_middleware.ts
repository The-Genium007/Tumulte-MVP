import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import app from '@adonisjs/core/services/app'
import env from '#start/env'

/**
 * Middleware pour ajouter les headers de sécurité HTTP
 * Protection contre clickjacking, XSS, MIME sniffing, etc.
 *
 * Based on OWASP security headers recommendations and Helmet.js defaults.
 */
export default class SecurityHeadersMiddleware {
  async handle({ request, response }: HttpContext, next: NextFn) {
    // Exécuter la requête
    await next()

    const isOverlayRoute = request.url().startsWith('/overlay')
    const frontendUrl = env.get('FRONTEND_URL', 'http://localhost:3000')

    // ===== Basic Security Headers =====

    // Prevent MIME type sniffing
    response.header('X-Content-Type-Options', 'nosniff')

    // X-Frame-Options: exclude /overlay routes for OBS Browser Source
    if (!isOverlayRoute) {
      response.header('X-Frame-Options', 'DENY')
    }

    // XSS Protection (legacy browsers)
    response.header('X-XSS-Protection', '1; mode=block')

    // Referrer Policy
    response.header('Referrer-Policy', 'strict-origin-when-cross-origin')

    // Permissions Policy (formerly Feature-Policy)
    response.header(
      'Permissions-Policy',
      'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
    )

    // Prevent DNS prefetching
    response.header('X-DNS-Prefetch-Control', 'off')

    // Download options for IE
    response.header('X-Download-Options', 'noopen')

    // Disable client-side caching for API responses (unless explicitly set)
    if (!response.getHeader('Cache-Control')) {
      response.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
      response.header('Pragma', 'no-cache')
      response.header('Expires', '0')
    }

    // ===== Production-only Headers =====

    if (app.inProduction) {
      // HSTS - Force HTTPS for 1 year
      response.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')

      // Content Security Policy
      // Configured for API backend - adjust if serving HTML
      const cspDirectives = [
        "default-src 'self'",
        `connect-src 'self' ${frontendUrl} wss: https://api.twitch.tv https://id.twitch.tv`,
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https://static-cdn.jtvnw.net",
        "font-src 'self'",
        "object-src 'none'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        'upgrade-insecure-requests',
      ]

      // Allow iframe embedding for overlay routes (OBS Browser Source)
      if (isOverlayRoute) {
        cspDirectives[cspDirectives.indexOf("frame-ancestors 'none'")] = 'frame-ancestors *'
      }

      response.header('Content-Security-Policy', cspDirectives.join('; '))

      // Cross-Origin policies
      response.header('Cross-Origin-Opener-Policy', 'same-origin')
      response.header('Cross-Origin-Resource-Policy', 'same-origin')

      // Except for overlay routes which need cross-origin access
      if (isOverlayRoute) {
        response.header('Cross-Origin-Resource-Policy', 'cross-origin')
      }
    }
  }
}
