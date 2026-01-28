/**
 * GET /health
 * Liveness probe - lightweight check that server is running
 * Used by Docker HEALTHCHECK for container health
 */
export default defineEventHandler(() => ({
  status: 'healthy',
  timestamp: new Date().toISOString(),
}))
