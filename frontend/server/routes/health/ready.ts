/**
 * GET /health/ready
 * Readiness probe - checks if app can serve traffic
 * Used by load balancers to determine if replica should receive traffic
 *
 * For SPA mode, readiness simply means "server is up and responding"
 */
export default defineEventHandler((event) => {
  const startTime = Date.now()

  setHeader(event, 'X-Readiness-Check-Duration-Ms', String(Date.now() - startTime))

  return {
    ready: true,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  }
})
