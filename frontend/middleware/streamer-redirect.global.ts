/**
 * Streamer Redirect Middleware (Global)
 *
 * Redirects legacy /streamer/* routes to /dashboard/*
 * This ensures backwards compatibility for users with old bookmarks or links.
 */
export default defineNuxtRouteMiddleware((to) => {
  if (to.path.startsWith('/streamer')) {
    const newPath = to.path.replace(/^\/streamer/, '/dashboard')
    return navigateTo(
      {
        path: newPath,
        query: to.query,
        hash: to.hash,
      },
      { redirectCode: 301 }
    )
  }
})
