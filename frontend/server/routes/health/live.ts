/**
 * GET /health/live
 * Minimal liveness probe - just confirms process is alive
 * Fastest possible response for frequent polling
 */
export default defineEventHandler(() => ({ alive: true }))
