import type { CampaignMembership } from "@/types";

// Owner du GM - autorisation permanente
export const mockMemberOwner: CampaignMembership = {
  id: "mock-member-001",
  status: "ACTIVE",
  isOwner: true,
  invitedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  acceptedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  pollAuthorizationGrantedAt: null,
  pollAuthorizationExpiresAt: null,
  isPollAuthorized: true,
  authorizationRemainingSeconds: null,
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

// Partner autorisé avec beaucoup de temps restant
export const mockMemberPartnerAuthorized: CampaignMembership = {
  id: "mock-member-002",
  status: "ACTIVE",
  isOwner: false,
  invitedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  acceptedAt: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000).toISOString(),
  pollAuthorizationGrantedAt: new Date(
    Date.now() - 2 * 60 * 60 * 1000,
  ).toISOString(),
  pollAuthorizationExpiresAt: new Date(
    Date.now() + 10 * 60 * 60 * 1000,
  ).toISOString(),
  isPollAuthorized: true,
  authorizationRemainingSeconds: 10 * 60 * 60, // 10 heures
  streamer: {
    id: "mock-streamer-002",
    userId: "mock-user-002",
    twitchUserId: "111222333",
    twitchUsername: "bigstreamer_tv",
    twitchDisplayName: "BigStreamer_TV",
    twitchLogin: "bigstreamer_tv",
    profileImageUrl:
      "https://static-cdn.jtvnw.net/jtv_user_pictures/placeholder-profile_image-300x300.png",
    isActive: true,
    broadcasterType: "partner",
  },
};

// Affiliate autorisé avec peu de temps restant (< 1h)
export const mockMemberAffiliateShortTime: CampaignMembership = {
  id: "mock-member-003",
  status: "ACTIVE",
  isOwner: false,
  invitedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  acceptedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  pollAuthorizationGrantedAt: new Date(
    Date.now() - 11 * 60 * 60 * 1000,
  ).toISOString(),
  pollAuthorizationExpiresAt: new Date(
    Date.now() + 45 * 60 * 1000,
  ).toISOString(),
  isPollAuthorized: true,
  authorizationRemainingSeconds: 45 * 60, // 45 minutes
  streamer: {
    id: "mock-streamer-003",
    userId: "mock-user-003",
    twitchUserId: "444555666",
    twitchUsername: "streamerjdr_42",
    twitchDisplayName: "StreamerJDR_42",
    twitchLogin: "streamerjdr_42",
    profileImageUrl:
      "https://static-cdn.jtvnw.net/jtv_user_pictures/placeholder-profile_image-300x300.png",
    isActive: true,
    broadcasterType: "affiliate",
  },
};

// Streamer non autorisé
export const mockMemberNotAuthorized: CampaignMembership = {
  id: "mock-member-004",
  status: "ACTIVE",
  isOwner: false,
  invitedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  acceptedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
  pollAuthorizationGrantedAt: null,
  pollAuthorizationExpiresAt: null,
  isPollAuthorized: false,
  authorizationRemainingSeconds: null,
  streamer: {
    id: "mock-streamer-004",
    userId: "mock-user-004",
    twitchUserId: "777888999",
    twitchUsername: "roleplay_master",
    twitchDisplayName: "Roleplay_Master",
    twitchLogin: "roleplay_master",
    profileImageUrl:
      "https://static-cdn.jtvnw.net/jtv_user_pictures/placeholder-profile_image-300x300.png",
    isActive: true,
    broadcasterType: "affiliate",
  },
};

// Streamer en attente (PENDING)
export const mockMemberPending: CampaignMembership = {
  id: "mock-member-005",
  status: "PENDING",
  isOwner: false,
  invitedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  acceptedAt: null,
  pollAuthorizationGrantedAt: null,
  pollAuthorizationExpiresAt: null,
  isPollAuthorized: false,
  authorizationRemainingSeconds: null,
  streamer: {
    id: "mock-streamer-005",
    userId: "mock-user-005",
    twitchUserId: "101010101",
    twitchUsername: "newbie_stream",
    twitchDisplayName: "Newbie_Stream",
    twitchLogin: "newbie_stream",
    profileImageUrl:
      "https://static-cdn.jtvnw.net/jtv_user_pictures/placeholder-profile_image-300x300.png",
    isActive: true,
    broadcasterType: "affiliate",
  },
};

// Streamer inactif
export const mockMemberInactive: CampaignMembership = {
  id: "mock-member-006",
  status: "ACTIVE",
  isOwner: false,
  invitedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
  acceptedAt: new Date(Date.now() - 24 * 24 * 60 * 60 * 1000).toISOString(),
  pollAuthorizationGrantedAt: null,
  pollAuthorizationExpiresAt: null,
  isPollAuthorized: false,
  authorizationRemainingSeconds: null,
  streamer: {
    id: "mock-streamer-006",
    userId: "mock-user-006",
    twitchUserId: "202020202",
    twitchUsername: "inactive_player",
    twitchDisplayName: "Inactive_Player",
    twitchLogin: "inactive_player",
    profileImageUrl: null,
    isActive: false,
    broadcasterType: "affiliate",
  },
};

// Streamer en live (sera associé au liveStatus)
export const mockMemberLive: CampaignMembership = {
  id: "mock-member-007",
  status: "ACTIVE",
  isOwner: false,
  invitedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
  acceptedAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(),
  pollAuthorizationGrantedAt: new Date(
    Date.now() - 1 * 60 * 60 * 1000,
  ).toISOString(),
  pollAuthorizationExpiresAt: new Date(
    Date.now() + 11 * 60 * 60 * 1000,
  ).toISOString(),
  isPollAuthorized: true,
  authorizationRemainingSeconds: 11 * 60 * 60, // 11 heures
  streamer: {
    id: "mock-streamer-007",
    userId: "mock-user-007",
    twitchUserId: "303030303",
    twitchUsername: "live_gamer",
    twitchDisplayName: "Live_Gamer",
    twitchLogin: "live_gamer",
    profileImageUrl:
      "https://static-cdn.jtvnw.net/jtv_user_pictures/placeholder-profile_image-300x300.png",
    isActive: true,
    broadcasterType: "partner",
  },
};

// Streamer non-affilié
export const mockMemberNonAffiliate: CampaignMembership = {
  id: "mock-member-008",
  status: "ACTIVE",
  isOwner: false,
  invitedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  acceptedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  pollAuthorizationGrantedAt: null,
  pollAuthorizationExpiresAt: null,
  isPollAuthorized: false,
  authorizationRemainingSeconds: null,
  streamer: {
    id: "mock-streamer-008",
    userId: "mock-user-008",
    twitchUserId: "404040404",
    twitchUsername: "casual_streamer",
    twitchDisplayName: "Casual_Streamer",
    twitchLogin: "casual_streamer",
    profileImageUrl:
      "https://static-cdn.jtvnw.net/jtv_user_pictures/placeholder-profile_image-300x300.png",
    isActive: true,
    broadcasterType: "",
  },
};

export const mockMembers: CampaignMembership[] = [
  mockMemberOwner,
  mockMemberPartnerAuthorized,
  mockMemberAffiliateShortTime,
  mockMemberNotAuthorized,
  mockMemberPending,
  mockMemberInactive,
  mockMemberLive,
  mockMemberNonAffiliate,
];
