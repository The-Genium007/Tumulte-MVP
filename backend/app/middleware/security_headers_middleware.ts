import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import app from '@adonisjs/core/services/app'

/**
 * Middleware pour ajouter les headers de sécurité HTTP
 * Protection contre clickjacking, XSS, MIME sniffing, etc.
 */
export default class SecurityHeadersMiddleware {
  async handle({ response }: HttpContext, next: NextFn) {
    // Exécuter la requête
    await next()

    // Ajouter les headers de sécurité
    response.header('X-Content-Type-Options', 'nosniff')
    response.header('X-Frame-Options', 'DENY')
    response.header('X-XSS-Protection', '1; mode=block')
    response.header('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')

    // HSTS uniquement en production (HTTPS requis)
    if (app.inProduction) {
      response.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    }
  }
}
