import { computed, ref } from "vue";
import { useMockDataStore } from "@/stores/mockData";
import type {
  User,
  Campaign,
  CampaignMembership,
  CampaignInvitation,
  AuthorizationStatus,
  LiveStatusMap,
} from "@/types";

// Type pour le module de données mockées
export interface MockDataModule {
  mockUsers: {
    gmUser: User;
    streamerUser: User;
  };
  mockCampaigns: Campaign[];
  mockMembers: CampaignMembership[];
  mockInvitations: CampaignInvitation[];
  mockAuthorizationStatuses: AuthorizationStatus[];
  mockLiveStatus: LiveStatusMap;
  mockPolls: Array<{
    id: string;
    campaignId: string;
    question: string;
    options: string[];
    type: "UNIQUE" | "STANDARD";
    durationSeconds: number;
    orderIndex: number;
    channelPointsPerVote: number | null;
    channelPointsEnabled: boolean;
    lastLaunchedAt: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
}

// Cache pour éviter de recharger les données à chaque appel
const mockDataCache = ref<MockDataModule | null>(null);
const loadAttempted = ref(false);

export function useMockData() {
  const store = useMockDataStore();

  // État réactif
  const enabled = computed(() => store.isEnabled);

  /**
   * Charge les données mockées depuis le dossier .mockdata
   * Retourne null si le dossier n'existe pas (prod ou pas configuré)
   */
  async function loadMockData(): Promise<MockDataModule | null> {
    // Retourner le cache si déjà chargé
    if (mockDataCache.value) {
      return mockDataCache.value;
    }

    // Ne pas réessayer si déjà tenté
    if (loadAttempted.value) {
      return null;
    }

    loadAttempted.value = true;

    try {
      // Import dynamique - échoue silencieusement si le dossier n'existe pas
      const module = await import("@/.mockdata");
      mockDataCache.value = module as MockDataModule;
      return mockDataCache.value;
    } catch {
      // Le dossier n'existe pas ou erreur d'import - c'est normal en prod
      return null;
    }
  }

  /**
   * Helper pour injecter les mock data quand l'API retourne un tableau vide
   * Utilise les mock data seulement si enabled ET apiData est vide
   */
  function withMockFallback<T>(apiData: T[], mockData: T[]): T[] {
    if (store.isEnabled && apiData.length === 0) {
      return mockData;
    }
    return apiData;
  }

  /**
   * Helper pour remplacer complètement les données API par les mock data
   * Utile pour les objets uniques (user, campaign details, etc.)
   */
  function withMockOverride<T>(apiData: T | null, mockData: T): T {
    if (store.isEnabled) {
      return mockData;
    }
    return apiData ?? mockData;
  }

  /**
   * Vérifie si une donnée est mockée (id commence par "mock-")
   */
  function isMockData(id: string | undefined): boolean {
    return id?.startsWith("mock-") ?? false;
  }

  /**
   * Réinitialise le cache (utile pour les tests)
   */
  function resetCache(): void {
    mockDataCache.value = null;
    loadAttempted.value = false;
  }

  return {
    // État
    enabled,

    // Actions du store
    toggle: store.toggle,
    enable: store.enable,
    disable: store.disable,

    // Helpers
    loadMockData,
    withMockFallback,
    withMockOverride,
    isMockData,
    resetCache,
  };
}
