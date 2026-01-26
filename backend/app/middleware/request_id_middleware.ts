import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { randomUUID } from 'node:crypto'

/**
 * Middleware that assigns a unique request ID to each HTTP request.
 *
 * This enables:
 * - Request tracing across logs
 * - Correlation of logs for the same request
 * - Debugging distributed systems
 * - Support for X-Request-ID header from load balancers
 *
 * The request ID is:
 * 1. Taken from incoming X-Request-ID header (if present)
 * 2. Or generated as a new UUID
 * 3. Added to response headers for client correlation
 * 4. Available in HttpContext for logging
 */
export default class RequestIdMiddleware {
  /**
   * Header name for request ID
   */
  private readonly headerName = 'X-Request-ID'

  async handle(ctx: HttpContext, next: NextFn) {
    const { request, response } = ctx

    // Use existing request ID from header (e.g., from load balancer)
    // or generate a new one
    const requestId = request.header(this.headerName) || randomUUID()

    // Store request ID in the context for access in controllers/services
    // Type augmentation is defined at the bottom of this file
    ctx.requestId = requestId

    // Add request ID to response headers
    response.header(this.headerName, requestId)

    // Continue with the request
    await next()
  }
}

/**
 * Type augmentation to add requestId to HttpContext
 */
declare module '@adonisjs/core/http' {
  interface HttpContext {
    requestId?: string
  }
}
