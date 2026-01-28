/**
 * Email Verified Middleware
 *
 * Ensures the authenticated user has verified their email address.
 * Use this middleware on routes that require full account access.
 *
 * Routes that should be accessible without email verification:
 * - /verify-email (to see verification status and resend)
 * - /settings (to manage account, including resending verification)
 * - /logout related functionality
 */
export default defineNuxtRouteMiddleware(async (to, _from) => {
  const { user, fetchMe, isEmailVerified } = useAuth()

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

  // Check if email is verified
  if (!isEmailVerified.value) {
    // Store the intended destination for after verification
    return navigateTo({
      path: '/verify-email',
      query: { redirect: to.fullPath },
    })
  }
})
