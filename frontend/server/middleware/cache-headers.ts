/**
 * Middleware to add Cache-Control headers optimized for Cloudflare
 *
 * Strategy:
 * - Static assets (_nuxt/*): Long cache with immutable (content-hashed)
 * - HTML/routes: Short cache, revalidate (SPA shell)
 * - Health/metrics endpoints: No cache (real-time status)
 * - Service worker: No cache (must always be fresh)
 *
 * Cloudflare will respect these headers and cache at edge.
 */
export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname

  // Health endpoints - never cache
  if (path.startsWith('/health')) {
    setHeader(event, 'Cache-Control', 'no-store, no-cache, must-revalidate')
    return
  }

  // Metrics endpoint - never cache
  if (path === '/metrics') {
    setHeader(event, 'Cache-Control', 'no-store, no-cache, must-revalidate')
    return
  }

  // Service worker - never cache (must check for updates)
  if (path === '/sw.js' || path.startsWith('/sw-')) {
    setHeader(event, 'Cache-Control', 'no-cache, no-store, must-revalidate')
    return
  }

  // Static assets with content hash (_nuxt/*)
  // These are immutable - can cache forever
  if (path.startsWith('/_nuxt/')) {
    setHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')
    return
  }

  // Other static assets (icons, images, fonts)
  const staticExtensions = /\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|webp|avif)$/i
  if (staticExtensions.test(path)) {
    // Cache for 1 week, allow revalidation
    setHeader(event, 'Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400')
    return
  }

  // Manifest and PWA files
  if (path === '/manifest.webmanifest' || path.endsWith('.webmanifest')) {
    // Cache for 1 day - allows PWA updates to propagate
    setHeader(event, 'Cache-Control', 'public, max-age=86400')
    return
  }

  // HTML pages (SPA shell) - short cache with revalidation
  // This allows Cloudflare to cache while ensuring updates propagate
  if (path === '/' || !path.includes('.')) {
    setHeader(event, 'Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
    return
  }

  // Default: moderate caching for other files (CSS, JS without hash)
  setHeader(event, 'Cache-Control', 'public, max-age=3600, stale-while-revalidate=7200')
})
