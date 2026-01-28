/**
 * Auth Middleware
 *
 * Protects routes that require authentication.
 * Handles offline data validation and session verification.
 */
export default defineNuxtRouteMiddleware(async (to, _from) => {
  const { user, fetchMe, isOfflineData, hasFetchedUser } = useAuth()

  // If user is not loaded or we only have stale offline data, try to fetch
  const shouldFetch = !user.value || (isOfflineData.value && !hasFetchedUser.value)

  if (shouldFetch) {
    try {
      await fetchMe()
    } catch {
      // Failed to fetch user - redirect to login with return URL
      return navigateTo({
        path: '/login',
        query: { redirect: to.fullPath },
      })
    }
  }

  // If still no user after fetch, redirect to login
  if (!user.value) {
    return navigateTo({
      path: '/login',
      query: { redirect: to.fullPath },
    })
  }
})
