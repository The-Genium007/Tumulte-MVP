import type { User } from "@/types";

// Utilisateur Maître de Jeu (GM) - Partner Twitch
export const mockGmUser: User = {
  id: "mock-user-gm-001",
  displayName: "MaitreJeu_Epic",
  email: "mj.epic@example.com",
  streamer: {
    id: "mock-streamer-gm-001",
    userId: "mock-user-gm-001",
    twitchUserId: "123456789",
    twitchUsername: "maitrejeu_epic",
    twitchDisplayName: "MaitreJeu_Epic",
    twitchLogin: "maitrejeu_epic",
    profileImageUrl:
      "https://static-cdn.jtvnw.net/jtv_user_pictures/placeholder-profile_image-300x300.png",
    isActive: true,
    broadcasterType: "partner",
  },
};

// Utilisateur Streamer - Affiliate Twitch
export const mockStreamerUser: User = {
  id: "mock-user-streamer-001",
  displayName: "StreamerJDR_42",
  email: "streamer42@example.com",
  streamer: {
    id: "mock-streamer-001",
    userId: "mock-user-streamer-001",
    twitchUserId: "987654321",
    twitchUsername: "streamerjdr_42",
    twitchDisplayName: "StreamerJDR_42",
    twitchLogin: "streamerjdr_42",
    profileImageUrl:
      "https://static-cdn.jtvnw.net/jtv_user_pictures/placeholder-profile_image-300x300.png",
    isActive: true,
    broadcasterType: "affiliate",
  },
};

export const mockUsers = {
  gmUser: mockGmUser,
  streamerUser: mockStreamerUser,
};
