import { ref, readonly } from "vue";

interface PollStartEvent {
  pollInstanceId: string;
  question: string;
  options: string[];
  durationSeconds: number;
}

interface PollUpdateEvent {
  pollInstanceId: string;
  votesByOption: Record<string, number>;
  totalVotes: number;
  percentages: Record<string, number>;
}

interface PollEndEvent {
  pollInstanceId: string;
  finalVotes: Record<string, number>;
  totalVotes: number;
  percentages: Record<string, number>;
  winnerIndex: number | null;
}

/**
 * Client SSE natif pour remplacer @adonisjs/transmit-client
 */
class NativeSSEClient {
  private eventSource: EventSource | null = null;
  private subscriptions: Map<
    string,
    Array<(message: { event: string; data: unknown }) => void>
  > = new Map();
  private baseUrl: string;
  private uid: string;
  private isConnected = false;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    // Générer un UID unique pour ce client
    this.uid = crypto.randomUUID();
    console.log(`[NativeSSE] Client created with UID: ${this.uid}`);
  }

  /**
   * Établir la connexion SSE globale (une seule pour tous les canaux)
   */
  private async connect(): Promise<void> {
    if (this.eventSource) {
      console.log("[NativeSSE] Already connected");
      return;
    }

    return new Promise((resolve, reject) => {
      const url = `${this.baseUrl}/__transmit/events?uid=${encodeURIComponent(this.uid)}`;

      console.log(`[NativeSSE] ========== CONNECTING TO SSE ==========`);
      console.log(`[NativeSSE] UID: ${this.uid}`);
      console.log(`[NativeSSE] URL: ${url}`);

      this.eventSource = new EventSource(url, {
        withCredentials: true,
      });

      this.eventSource.addEventListener("open", () => {
        console.log(`[NativeSSE] ✅ SSE connection opened`);
        console.log(
          `[NativeSSE] EventSource readyState: ${this.eventSource?.readyState}`,
        );
        this.isConnected = true;
        resolve();
      });

      this.eventSource.addEventListener("error", (error) => {
        console.error(`[NativeSSE] ❌ SSE connection error:`, error);
        console.error(
          `[NativeSSE] EventSource readyState: ${this.eventSource?.readyState}`,
        );

        if (
          this.eventSource &&
          this.eventSource.readyState === EventSource.CLOSED
        ) {
          console.error(`[NativeSSE] Connection CLOSED - SSE stream ended`);
          this.isConnected = false;
          reject(error);
        } else if (
          this.eventSource &&
          this.eventSource.readyState === EventSource.CONNECTING
        ) {
          console.warn(`[NativeSSE] Reconnecting...`);
        }
      });

      // Écouter TOUS les messages SSE (tous les canaux)
      this.eventSource.addEventListener("message", (event) => {
        try {
          console.log(`[NativeSSE] Raw SSE message received:`, event.data);
          const parsed = JSON.parse(event.data);
          console.log(`[NativeSSE] Parsed SSE message:`, parsed);

          // Format Transmit: { channel: string, payload: { event: string, data: unknown } }
          const { channel, payload } = parsed;

          if (!channel || !payload) {
            console.warn(
              `[NativeSSE] Invalid message format (missing channel or payload):`,
              parsed,
            );
            return;
          }

          console.log(`[NativeSSE] Message for channel "${channel}":`, payload);

          // Distribuer le message aux handlers de ce canal
          const handlers = this.subscriptions.get(channel);
          if (handlers && handlers.length > 0) {
            console.log(
              `[NativeSSE] Dispatching to ${handlers.length} handler(s) for channel "${channel}"`,
            );
            handlers.forEach((handler) => {
              handler(payload);
            });
          } else {
            console.warn(
              `[NativeSSE] No handlers registered for channel "${channel}"`,
            );
          }
        } catch (error) {
          console.error(
            `[NativeSSE] Failed to parse SSE message:`,
            error,
            event.data,
          );
        }
      });
    });
  }

  /**
   * S'abonner à un canal spécifique via POST /__transmit/subscribe
   */
  private async subscribeToChannel(channel: string): Promise<void> {
    console.log(`[NativeSSE] Subscribing to channel via HTTP: ${channel}`);

    try {
      const response = await fetch(`${this.baseUrl}/__transmit/subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          uid: this.uid,
          channel: channel,
        }),
      });

      console.log(`[NativeSSE] Subscribe response status: ${response.status}`);

      if (!response.ok) {
        const text = await response.text();
        console.error(
          `[NativeSSE] Failed to subscribe to channel "${channel}":`,
          text,
        );
        throw new Error(`Subscribe failed: ${response.status} ${text}`);
      }

      console.log(
        `[NativeSSE] ✅ Successfully subscribed to channel "${channel}"`,
      );
    } catch (error) {
      console.error(
        `[NativeSSE] Error subscribing to channel "${channel}":`,
        error,
      );
      throw error;
    }
  }

  /**
   * Se désabonner d'un canal via POST /__transmit/unsubscribe
   */
  private async unsubscribeFromChannel(channel: string): Promise<void> {
    console.log(`[NativeSSE] Unsubscribing from channel: ${channel}`);

    try {
      const response = await fetch(`${this.baseUrl}/__transmit/unsubscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          uid: this.uid,
          channel: channel,
        }),
      });

      if (!response.ok) {
        console.error(
          `[NativeSSE] Failed to unsubscribe from channel "${channel}"`,
        );
      } else {
        console.log(
          `[NativeSSE] ✅ Successfully unsubscribed from channel "${channel}"`,
        );
      }
    } catch (error) {
      console.error(
        `[NativeSSE] Error unsubscribing from channel "${channel}":`,
        error,
      );
    }
  }

  /**
   * Créer une souscription à un canal SSE
   */
  subscription(channel: string) {
    const messageHandlers: Array<
      (message: { event: string; data: unknown }) => void
    > = [];

    return {
      /**
       * Enregistrer un handler pour les messages
       */
      onMessage(handler: (message: { event: string; data: unknown }) => void) {
        messageHandlers.push(handler);
      },

      /**
       * Créer la connexion SSE et s'abonner au canal
       */
      create: async () => {
        console.log(`[NativeSSE] ========== CREATING SUBSCRIPTION ==========`);
        console.log(`[NativeSSE] Channel: ${channel}`);

        // 1. S'assurer que la connexion SSE globale est établie
        if (!this.isConnected) {
          console.log(
            `[NativeSSE] SSE not connected yet, establishing connection...`,
          );
          await this.connect();
        }

        // 2. Enregistrer les handlers pour ce canal
        if (!this.subscriptions.has(channel)) {
          this.subscriptions.set(channel, []);
        }
        this.subscriptions.get(channel)!.push(...messageHandlers);
        console.log(
          `[NativeSSE] Registered ${messageHandlers.length} handler(s) for channel "${channel}"`,
        );

        // 3. S'abonner au canal via POST /__transmit/subscribe
        await this.subscribeToChannel(channel);

        console.log(
          `[NativeSSE] ✅ Subscription created successfully for channel "${channel}"`,
        );
      },

      /**
       * Fermer l'abonnement au canal
       */
      delete: async () => {
        console.log(
          `[NativeSSE] Deleting subscription for channel: ${channel}`,
        );

        // 1. Se désabonner du canal
        await this.unsubscribeFromChannel(channel);

        // 2. Retirer les handlers
        this.subscriptions.delete(channel);
      },
    };
  }

  /**
   * Fermer toutes les connexions
   */
  shutdown() {
    console.log(`[NativeSSE] Shutting down client`);

    // Fermer toutes les souscriptions
    this.subscriptions.clear();

    // Fermer l'EventSource
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      this.isConnected = false;
    }
  }
}

/**
 * Composable pour gérer les connexions WebSocket/SSE avec le backend
 */
export const useWebSocket = () => {
  const config = useRuntimeConfig();
  const API_URL = config.public.apiBase;

  const connected = ref(false);
  const client = ref<NativeSSEClient | null>(null);

  /**
   * Initialiser la connexion SSE
   */
  const connect = () => {
    if (client.value) {
      console.log("[NativeSSE] Already connected");
      return;
    }

    console.log(`[NativeSSE] Initializing client with URL: ${API_URL}`);
    client.value = new NativeSSEClient(API_URL);
    connected.value = true;
    console.log("[NativeSSE] Client initialized");
  };

  /**
   * S'abonner aux événements d'un poll spécifique
   */
  const subscribeToPoll = (
    pollInstanceId: string,
    callbacks: {
      onStart?: (data: PollStartEvent) => void;
      onUpdate?: (data: PollUpdateEvent) => void;
      onEnd?: (data: PollEndEvent) => void;
    },
  ): (() => Promise<void>) => {
    console.log(
      "[DEBUG subscribeToPoll] ========== SUBSCRIBING TO POLL ==========",
    );
    console.log("[DEBUG subscribeToPoll] pollInstanceId:", pollInstanceId);
    console.log("[DEBUG subscribeToPoll] client.value exists:", !!client.value);
    console.log("[DEBUG subscribeToPoll] callbacks:", {
      hasOnStart: !!callbacks.onStart,
      hasOnUpdate: !!callbacks.onUpdate,
      hasOnEnd: !!callbacks.onEnd,
    });

    if (!client.value) {
      console.log(
        "[DEBUG subscribeToPoll] Client not initialized, connecting...",
      );
      connect();
      console.log(
        "[DEBUG subscribeToPoll] Connected, client.value:",
        !!client.value,
      );
    }

    const channel = `poll:${pollInstanceId}`;
    console.log(`[WebSocket] Subscribing to channel: ${channel}`);
    console.log("[DEBUG subscribeToPoll] API_URL:", API_URL);

    let subscription;
    try {
      console.log(
        "[DEBUG subscribeToPoll] About to call client.value!.subscription()...",
      );
      subscription = client.value!.subscription(channel);
      console.log(
        "[DEBUG subscribeToPoll] Subscription object created:",
        !!subscription,
      );
    } catch (error) {
      console.error(
        "[ERROR subscribeToPoll] Failed to create subscription:",
        error,
      );
      console.error("[ERROR subscribeToPoll] Error details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        clientExists: !!client.value,
        channel,
      });
      throw error;
    }

    // Enregistrer le listener AVANT de créer la subscription
    console.log("[DEBUG subscribeToPoll] Registering onMessage listener...");
    subscription.onMessage((message: { event: string; data: unknown }) => {
      console.log(`[WebSocket] Message received on ${channel}:`, message);

      switch (message.event) {
        case "poll:start":
          console.log(`[WebSocket] Calling onStart callback`);
          if (callbacks.onStart) {
            callbacks.onStart(message.data as PollStartEvent);
          } else {
            console.warn(`[WebSocket] No onStart callback defined`);
          }
          break;
        case "poll:update":
          console.log(`[WebSocket] Calling onUpdate callback`);
          if (callbacks.onUpdate) {
            callbacks.onUpdate(message.data as PollUpdateEvent);
          } else {
            console.warn(`[WebSocket] No onUpdate callback defined`);
          }
          break;
        case "poll:end":
          console.log(
            `[WebSocket] *** POLL:END EVENT DETECTED IN COMPOSABLE ***`,
          );
          console.log(`[WebSocket] Has onEnd callback:`, !!callbacks.onEnd);
          if (callbacks.onEnd) {
            console.log(`[WebSocket] Calling onEnd callback now...`);
            callbacks.onEnd(message.data as PollEndEvent);
            console.log(`[WebSocket] onEnd callback completed`);
          } else {
            console.error(`[WebSocket] ERROR: No onEnd callback defined!`);
          }
          break;
        default:
          console.warn(`[WebSocket] Unknown event type: ${message.event}`);
      }
    });

    console.log("[DEBUG subscribeToPoll] onMessage listener registered");

    // Créer la connexion SSE (après avoir enregistré le listener) - ASYNC!
    subscription
      .create()
      .then(() => {
        console.log(`[WebSocket] Subscription created for channel: ${channel}`);
        console.log(
          "[DEBUG subscribeToPoll] Subscription.create() called successfully - ready to receive messages",
        );
      })
      .catch((error: unknown) => {
        console.error(
          `[WebSocket] Failed to create subscription for channel ${channel}:`,
          error,
        );
      });

    // Retourner une fonction de nettoyage asynchrone
    return async () => {
      console.log(`[WebSocket] Unsubscribing from channel: ${channel}`);
      await subscription.delete();
    };
  };

  /**
   * S'abonner aux événements d'un streamer (pour les polls de sa campagne)
   */
  const subscribeToStreamerPolls = (
    streamerId: string,
    callbacks: {
      onPollStart?: (data: PollStartEvent) => void;
      onPollEnd?: (data: PollEndEvent) => void;
      // eslint-disable-next-line @typescript-eslint/naming-convention
      onJoinedCampaign?: (data: { campaign_id: string }) => void;
      // eslint-disable-next-line @typescript-eslint/naming-convention
      onLeftCampaign?: (data: { campaign_id: string }) => void;
    },
  ): (() => Promise<void>) => {
    if (!client.value) {
      connect();
    }

    const channel = `streamer:${streamerId}:polls`;
    console.log(`[WebSocket] Subscribing to streamer channel: ${channel}`);

    const subscription = client.value!.subscription(channel);

    subscription.onMessage((message: { event: string; data: unknown }) => {
      console.log(`[WebSocket] Message received on ${channel}:`, message);

      switch (message.event) {
        case "poll:start":
          if (callbacks.onPollStart) {
            callbacks.onPollStart(message.data as PollStartEvent);
          }
          break;
        case "poll:end":
          if (callbacks.onPollEnd) {
            callbacks.onPollEnd(message.data as PollEndEvent);
          }
          break;
        case "streamer:joined-campaign":
          if (callbacks.onJoinedCampaign) {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            callbacks.onJoinedCampaign(message.data as { campaign_id: string });
          }
          break;
        case "streamer:left-campaign":
          if (callbacks.onLeftCampaign) {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            callbacks.onLeftCampaign(message.data as { campaign_id: string });
          }
          break;
        default:
          console.warn(`[WebSocket] Unknown event type: ${message.event}`);
      }
    });

    subscription
      .create()
      .then(() => {
        console.log(
          `[WebSocket] Subscription created for streamer channel: ${channel}`,
        );
      })
      .catch((error: unknown) => {
        console.error(
          `[WebSocket] Failed to create subscription for streamer channel ${channel}:`,
          error,
        );
      });

    return async () => {
      console.log(`[WebSocket] Unsubscribing from channel: ${channel}`);
      await subscription.delete();
    };
  };

  /**
   * Fermer toutes les connexions
   */
  const disconnect = () => {
    if (client.value) {
      console.log("[NativeSSE] Disconnecting...");
      client.value.shutdown();
      client.value = null;
      connected.value = false;
    }
  };

  return {
    connected: readonly(connected),
    connect,
    subscribeToPoll,
    subscribeToStreamerPolls,
    disconnect,
  };
};
