/**
 * Auth Unverified Middleware
 *
 * Allows authenticated users regardless of email verification status.
 * Use this for pages like /verify-email where users need to be logged in
 * but don't need verified email yet.
 *
 * If the user IS verified, they can still access these pages (e.g., to
 * check their verification status in settings).
 */
export default defineNuxtRouteMiddleware(async (to, _from) => {
  const { user, fetchMe } = useAuth()

  // Ensure we have user data
  if (!user.value) {
    try {
      await fetchMe()
    } catch {
      return navigateTo({
        path: '/login',
        query: { redirect: to.fullPath },
      })
    }
  }

  // If still no user, redirect to login
  if (!user.value) {
    return navigateTo({
      path: '/login',
      query: { redirect: to.fullPath },
    })
  }

  // User is authenticated - allow access regardless of verification status
})
