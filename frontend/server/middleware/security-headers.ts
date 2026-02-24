/**
 * Server middleware to add security headers
 * Excludes X-Frame-Options for /overlay routes to allow OBS Browser Source
 */
export default defineEventHandler((event) => {
  const url = getRequestURL(event)

  // Add security headers
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  setHeader(event, 'X-XSS-Protection', '1; mode=block')
  setHeader(event, 'Referrer-Policy', 'strict-origin-when-cross-origin')

  // HSTS: enforce HTTPS (1 year, include subdomains)
  setHeader(event, 'Strict-Transport-Security', 'max-age=31536000; includeSubDomains')

  // X-Frame-Options: exclude /overlay routes for OBS Browser Source
  const isOverlayRoute = url.pathname.startsWith('/overlay')
  if (!isOverlayRoute) {
    setHeader(event, 'X-Frame-Options', 'DENY')
  }
})
