import type { LiveStatusMap } from "@/types";

// Statuts live pour les membres mockés
// Les clés correspondent aux twitchUserId des membres
// Note: LiveStatusMap uses snake_case properties (is_live, game_name, etc.) to match Twitch API responses

/* eslint-disable camelcase */
export const mockLiveStatus: LiveStatusMap = {
  // Live_Gamer - En live avec beaucoup de viewers
  "303030303": {
    is_live: true,
    game_name: "Dungeons & Dragons",
    title: "Session JDR avec les copains ! #tumulte",
    viewer_count: 1247,
    started_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  // BigStreamer_TV - En live sans game_name
  "111222333": {
    is_live: true,
    game_name: undefined,
    title: "Just Chatting avant la session !",
    viewer_count: 342,
    started_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  // Tous les autres sont hors ligne
  "123456789": {
    is_live: false,
  },
  "444555666": {
    is_live: false,
  },
  "777888999": {
    is_live: false,
  },
  "101010101": {
    is_live: false,
  },
  "202020202": {
    is_live: false,
  },
  "404040404": {
    is_live: false,
  },
};
/* eslint-enable camelcase */
