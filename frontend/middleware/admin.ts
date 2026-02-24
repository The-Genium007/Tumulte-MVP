/**
 * Admin Middleware
 *
 * Protects routes that require admin role.
 * Must be used after 'auth' middleware to ensure user is loaded.
 */
export default defineNuxtRouteMiddleware(async () => {
  const { user, isAdmin, fetchMe, hasFetchedUser } = useAuth()

  // Ensure user is loaded
  if (!user.value && !hasFetchedUser.value) {
    try {
      await fetchMe()
    } catch {
      return navigateTo('/login')
    }
  }

  if (!user.value) {
    return navigateTo('/login')
  }

  if (!isAdmin.value) {
    return navigateTo('/dashboard')
  }
})
