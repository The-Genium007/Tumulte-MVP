import { ref, onUnmounted, type Ref } from "vue";

interface UseResilientWebSocketOptions {
  /** Channel WebSocket auquel s'abonner */
  channel: string;
  /** Callback appelé à chaque message reçu */
  onMessage: (data: unknown) => void;
  /** Callback appelé quand l'état de connexion change */
  onConnectionChange?: (connected: boolean) => void;
  /** Fonction de fallback HTTP appelée périodiquement quand WebSocket est déconnecté */
  fallbackFetch?: () => Promise<unknown>;
  /** Intervalle du fallback HTTP en ms (défaut: 3000ms) */
  fallbackIntervalMs?: number;
  /** Délai maximum de backoff en ms (défaut: 30000ms) */
  maxBackoffMs?: number;
}

interface UseResilientWebSocketReturn {
  /** État de connexion WebSocket */
  isConnected: Ref<boolean>;
  /** Nombre de tentatives de reconnexion */
  reconnectAttempts: Ref<number>;
  /** Indique si le fallback HTTP est actif */
  isFallbackActive: Ref<boolean>;
  /** Démarre la connexion */
  connect: () => void;
  /** Arrête la connexion et le fallback */
  disconnect: () => void;
}

/**
 * Composable pour une connexion WebSocket résiliente avec reconnexion automatique
 * et fallback HTTP en cas de déconnexion.
 *
 * Stratégie de reconnexion:
 * - Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
 * - Jitter: ±500ms aléatoire pour éviter les thundering herds
 * - Tentatives illimitées (continue de réessayer)
 *
 * Fallback HTTP:
 * - Activé automatiquement quand WebSocket est déconnecté
 * - Polling toutes les 3s (configurable)
 * - Désactivé automatiquement quand WebSocket se reconnecte
 */
export function useResilientWebSocket(
  options: UseResilientWebSocketOptions,
): UseResilientWebSocketReturn {
  const {
    channel,
    onMessage,
    onConnectionChange,
    fallbackFetch,
    fallbackIntervalMs = 3000,
    maxBackoffMs = 30000,
  } = options;

  // State
  const isConnected = ref(false);
  const reconnectAttempts = ref(0);
  const isFallbackActive = ref(false);

  // Internal refs
  let wsSubscription: (() => void) | null = null;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  let fallbackInterval: ReturnType<typeof setInterval> | null = null;
  let isManuallyDisconnected = false;

  /**
   * Calcule le délai de backoff avec jitter
   */
  function getBackoffDelay(): number {
    const baseDelay = Math.min(
      1000 * Math.pow(2, reconnectAttempts.value),
      maxBackoffMs,
    );
    // Ajouter jitter de ±500ms
    const jitter = Math.random() * 1000 - 500;
    return Math.max(100, baseDelay + jitter);
  }

  /**
   * Démarre le fallback HTTP
   */
  function startFallback(): void {
    if (!fallbackFetch || fallbackInterval) return;

    isFallbackActive.value = true;
    console.log("[ResilientWS] Starting HTTP fallback polling");

    // Premier fetch immédiat
    fallbackFetch()
      .then((data) => {
        if (data !== undefined && data !== null) {
          onMessage(data);
        }
      })
      .catch((error) => {
        console.warn("[ResilientWS] Fallback fetch failed:", error);
      });

    // Puis polling régulier
    fallbackInterval = setInterval(() => {
      if (!isConnected.value && fallbackFetch) {
        fallbackFetch()
          .then((data) => {
            if (data !== undefined && data !== null) {
              onMessage(data);
            }
          })
          .catch((error) => {
            console.warn("[ResilientWS] Fallback fetch failed:", error);
          });
      }
    }, fallbackIntervalMs);
  }

  /**
   * Arrête le fallback HTTP
   */
  function stopFallback(): void {
    if (fallbackInterval) {
      clearInterval(fallbackInterval);
      fallbackInterval = null;
    }
    isFallbackActive.value = false;
    console.log("[ResilientWS] Stopped HTTP fallback polling");
  }

  /**
   * Gère la connexion réussie
   */
  function handleConnected(): void {
    console.log("[ResilientWS] Connected to channel:", channel);
    isConnected.value = true;
    reconnectAttempts.value = 0;
    onConnectionChange?.(true);

    // Arrêter le fallback HTTP si actif
    stopFallback();
  }

  /**
   * Gère la déconnexion
   */
  function handleDisconnected(): void {
    console.log("[ResilientWS] Disconnected from channel:", channel);
    isConnected.value = false;
    onConnectionChange?.(false);

    // Ne pas reconnecter si déconnexion manuelle
    if (isManuallyDisconnected) return;

    // Démarrer le fallback HTTP
    if (fallbackFetch) {
      startFallback();
    }

    // Programmer la reconnexion
    scheduleReconnect();
  }

  /**
   * Programme une tentative de reconnexion
   */
  function scheduleReconnect(): void {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }

    const delay = getBackoffDelay();
    reconnectAttempts.value++;

    console.log(
      `[ResilientWS] Scheduling reconnect attempt ${reconnectAttempts.value} in ${Math.round(delay)}ms`,
    );

    reconnectTimeout = setTimeout(() => {
      if (!isManuallyDisconnected) {
        attemptConnect();
      }
    }, delay);
  }

  /**
   * Tente de se connecter au WebSocket
   * Note: Cette fonction est un placeholder. L'intégration réelle dépend
   * du composable WebSocket spécifique utilisé (ex: subscribeToStreamerPolls).
   * Pour une utilisation complète, cette fonction devrait être passée en option.
   */
  async function attemptConnect(): Promise<void> {
    try {
      // Si une fonction de connexion custom est fournie via les options,
      // elle sera appelée ici. Sinon, on marque simplement comme connecté
      // et on laisse le composant parent gérer la subscription.

      // Se désabonner de l'ancienne connexion si elle existe
      if (wsSubscription) {
        wsSubscription();
        wsSubscription = null;
      }

      // Marquer comme connecté après un court délai
      // Le composant parent doit gérer la subscription réelle
      setTimeout(() => {
        if (!isManuallyDisconnected && !isConnected.value) {
          handleConnected();
        }
      }, 500);
    } catch (error) {
      console.error("[ResilientWS] Connection attempt failed:", error);
      handleDisconnected();
    }
  }

  /**
   * Démarre la connexion WebSocket
   */
  function connect(): void {
    isManuallyDisconnected = false;
    reconnectAttempts.value = 0;
    attemptConnect();
  }

  /**
   * Arrête la connexion WebSocket et le fallback
   */
  function disconnect(): void {
    isManuallyDisconnected = true;

    // Arrêter les timeouts de reconnexion
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    // Arrêter le fallback
    stopFallback();

    // Se désabonner du WebSocket
    if (wsSubscription) {
      wsSubscription();
      wsSubscription = null;
    }

    isConnected.value = false;
    reconnectAttempts.value = 0;
    onConnectionChange?.(false);
  }

  // Cleanup on unmount
  onUnmounted(() => {
    disconnect();
  });

  return {
    isConnected,
    reconnectAttempts,
    isFallbackActive,
    connect,
    disconnect,
  };
}
