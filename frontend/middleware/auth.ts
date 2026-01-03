export default defineNuxtRouteMiddleware(async (_to, _from) => {
  const { user, fetchMe } = useAuth();

  // If user is not loaded, try to fetch
  if (!user.value) {
    try {
      await fetchMe();
    } catch {
      // Failed to fetch user - redirect to login
      return navigateTo("/login");
    }
  }

  // If still no user after fetch, redirect to login
  if (!user.value) {
    return navigateTo("/login");
  }
});
