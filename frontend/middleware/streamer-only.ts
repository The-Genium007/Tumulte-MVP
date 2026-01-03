export default defineNuxtRouteMiddleware(async (_to, _from) => {
  const { user } = useAuth();

  // Redirect to MJ if user is not a streamer
  if (user.value && user.value.role !== "STREAMER") {
    return navigateTo("/mj");
  }
});
