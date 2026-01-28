import type { user as User } from '#models/user'

/**
 * Format user data for API responses
 * Ensures consistent structure across all auth endpoints
 */
export async function formatUserResponse(user: User) {
  // Load relations if not already loaded
  if (!user.$preloaded.authProviders) {
    await user.load('authProviders')
  }
  if (!user.$preloaded.streamer) {
    await user.load('streamer')
  }

  return {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    emailVerifiedAt: user.emailVerifiedAt?.toISO() ?? null,
    tier: user.tier,
    avatarUrl: user.avatarUrl,
    isAdmin: user.isAdmin,
    isPremium: await user.isPremium(),
    hasPassword: user.password !== null,
    authProviders:
      user.authProviders?.map((p) => ({
        id: p.id,
        provider: p.provider,
        providerUserId: p.providerUserId,
        providerEmail: p.providerEmail,
        providerDisplayName: p.providerDisplayName,
        createdAt: p.createdAt.toISO(),
      })) ?? [],
    streamer: user.streamer
      ? {
          id: user.streamer.id,
          userId: user.streamer.userId,
          twitchUserId: user.streamer.twitchUserId,
          twitchUsername: user.streamer.twitchLogin,
          twitchDisplayName: user.streamer.twitchDisplayName,
          twitchLogin: user.streamer.twitchLogin,
          profileImageUrl: user.streamer.profileImageUrl,
          isActive: user.streamer.isActive,
          broadcasterType: user.streamer.broadcasterType,
        }
      : null,
    createdAt: user.createdAt.toISO(),
  }
}
