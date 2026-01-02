/* eslint-disable @typescript-eslint/no-this-alias */
// Tests need to capture 'this' from mock constructors to simulate EventSource behavior
import { describe, test, expect, beforeEach, vi, afterEach } from "vitest";
import { useWebSocket } from "~/composables/useWebSocket";

/* eslint-disable @typescript-eslint/naming-convention */
// Mock EventSource - static properties match browser API naming
class MockEventSource {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;

  url: string;
  readyState: number = MockEventSource.CONNECTING;
  private eventListeners: Map<string, ((event: unknown) => void)[]> = new Map();

  constructor(url: string) {
    this.url = url;
  }

  addEventListener(event: string, handler: (event: unknown) => void) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(handler);
  }

  removeEventListener(event: string, handler: (event: unknown) => void) {
    const handlers = this.eventListeners.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  close() {
    this.readyState = MockEventSource.CLOSED;
    this.dispatchEvent("error", {});
  }

  // Helper to simulate events
  dispatchEvent(eventType: string, eventData: unknown) {
    const handlers = this.eventListeners.get(eventType);
    if (handlers) {
      handlers.forEach((handler) => handler(eventData));
    }
  }

  // Helper to simulate opening connection
  simulateOpen() {
    this.readyState = MockEventSource.OPEN;
    this.dispatchEvent("open", {});
  }

  // Helper to simulate receiving message
  simulateMessage(data: string) {
    this.dispatchEvent("message", { data });
  }
}

/* eslint-enable @typescript-eslint/naming-convention */

global.EventSource = MockEventSource as unknown as typeof EventSource;

// Mock fetch globally
global.fetch = vi.fn();

// Mock crypto.randomUUID
Object.defineProperty(globalThis, "crypto", {
  value: {
    randomUUID: vi.fn(() => "mock-uuid-123"),
  },
  writable: true,
});

describe("useWebSocket Composable", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock useRuntimeConfig
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked((globalThis as any).useRuntimeConfig).mockReturnValue({
      public: {
        apiBase: "http://localhost:3333/api/v2",
      },
    } as ReturnType<typeof useRuntimeConfig>);

    // Mock successful subscribe/unsubscribe responses
    vi.mocked(fetch).mockImplementation(async (url) => {
      if (
        typeof url === "string" &&
        (url.includes("/__transmit/subscribe") ||
          url.includes("/__transmit/unsubscribe"))
      ) {
        return {
          ok: true,
          status: 200,
          text: async () => "OK",
        } as Response;
      }
      return {
        ok: false,
        status: 404,
      } as Response;
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  test("should initialize with disconnected state", () => {
    const { connected } = useWebSocket();

    expect(connected.value).toBe(false);
  });

  test("connect() should initialize SSE client", () => {
    const { connect, connected } = useWebSocket();

    connect();

    expect(connected.value).toBe(true);
  });

  test("connect() should not create duplicate clients", () => {
    const { connect } = useWebSocket();

    connect();
    const consoleLogSpy = vi.spyOn(console, "log");

    connect(); // Second call

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("Already connected"),
    );

    consoleLogSpy.mockRestore();
  });

  test("subscribeToPoll() should create SSE connection", async () => {
    const { subscribeToPoll } = useWebSocket();

    const mockEventSourceConstructor = vi.fn(
      (url: string) => new MockEventSource(url),
    );
    global.EventSource =
      mockEventSourceConstructor as unknown as typeof EventSource;

    subscribeToPoll("poll-123", {
      onStart: vi.fn(),
      onUpdate: vi.fn(),
      onEnd: vi.fn(),
    });

    // Wait for async initialization
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockEventSourceConstructor).toHaveBeenCalledWith(
      "http://localhost:3333/api/v2/__transmit/events?uid=mock-uuid-123",
      { withCredentials: true },
    );
  });

  test("subscribeToPoll() should subscribe to correct channel", async () => {
    const { subscribeToPoll } = useWebSocket();

    let eventSourceInstance: MockEventSource;
    global.EventSource = class extends MockEventSource {
      constructor(url: string) {
        super(url);
        eventSourceInstance = this;
      }
    } as unknown as typeof EventSource;

    subscribeToPoll("poll-456", {
      onUpdate: vi.fn(),
    });

    // Wait for EventSource to be created
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Simulate connection opened to trigger subscribe
    eventSourceInstance!.simulateOpen();

    // Wait for async subscribe call
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3333/api/v2/__transmit/subscribe",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          uid: "mock-uuid-123",
          channel: "poll:poll-456",
        }),
      }),
    );
  });

  test("subscribeToPoll() should handle poll:start events", async () => {
    const { subscribeToPoll } = useWebSocket();

    const onStart = vi.fn();
    const onUpdate = vi.fn();
    const onEnd = vi.fn();

    // Track the EventSource instance
    let eventSourceInstance: MockEventSource;
    global.EventSource = class extends MockEventSource {
      constructor(url: string) {
        super(url);
        eventSourceInstance = this;
      }
    } as unknown as typeof EventSource;

    subscribeToPoll("poll-789", {
      onStart,
      onUpdate,
      onEnd,
    });

    // Wait for EventSource to be created
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Simulate connection opened
    eventSourceInstance!.simulateOpen();

    // Wait for subscription to complete
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Simulate receiving poll:start event
    const startData = {
      pollInstanceId: "poll-789",
      question: "Test Question?",
      options: ["Option 1", "Option 2"],
      durationSeconds: 60,
    };

    eventSourceInstance!.simulateMessage(
      JSON.stringify({
        channel: "poll:poll-789",
        payload: {
          event: "poll:start",
          data: startData,
        },
      }),
    );

    expect(onStart).toHaveBeenCalledWith(startData);
    expect(onUpdate).not.toHaveBeenCalled();
    expect(onEnd).not.toHaveBeenCalled();
  });

  test("subscribeToPoll() should handle poll:update events", async () => {
    const { subscribeToPoll } = useWebSocket();

    const onUpdate = vi.fn();

    let eventSourceInstance: MockEventSource;
    global.EventSource = class extends MockEventSource {
      constructor(url: string) {
        super(url);
        eventSourceInstance = this;
      }
    } as unknown as typeof EventSource;

    subscribeToPoll("poll-update-1", {
      onUpdate,
    });

    await new Promise((resolve) => setTimeout(resolve, 10));
    eventSourceInstance!.simulateOpen();
    await new Promise((resolve) => setTimeout(resolve, 10));

    const updateData = {
      pollInstanceId: "poll-update-1",
      votesByOption: { "0": 10, "1": 5 },
      totalVotes: 15,
      percentages: { "0": 66.67, "1": 33.33 },
    };

    eventSourceInstance!.simulateMessage(
      JSON.stringify({
        channel: "poll:poll-update-1",
        payload: {
          event: "poll:update",
          data: updateData,
        },
      }),
    );

    expect(onUpdate).toHaveBeenCalledWith(updateData);
  });

  test("subscribeToPoll() should handle poll:end events", async () => {
    const { subscribeToPoll } = useWebSocket();

    const onEnd = vi.fn();

    let eventSourceInstance: MockEventSource;
    global.EventSource = class extends MockEventSource {
      constructor(url: string) {
        super(url);
        eventSourceInstance = this;
      }
    } as unknown as typeof EventSource;

    subscribeToPoll("poll-end-1", {
      onEnd,
    });

    await new Promise((resolve) => setTimeout(resolve, 10));
    eventSourceInstance!.simulateOpen();
    await new Promise((resolve) => setTimeout(resolve, 10));

    const endData = {
      pollInstanceId: "poll-end-1",
      finalVotes: { "0": 20, "1": 15 },
      totalVotes: 35,
      percentages: { "0": 57.14, "1": 42.86 },
      winnerIndex: 0,
    };

    eventSourceInstance!.simulateMessage(
      JSON.stringify({
        channel: "poll:poll-end-1",
        payload: {
          event: "poll:end",
          data: endData,
        },
      }),
    );

    expect(onEnd).toHaveBeenCalledWith(endData);
  });

  test("subscribeToPoll() should filter messages by channel", async () => {
    const { subscribeToPoll } = useWebSocket();

    const onUpdate = vi.fn();

    let eventSourceInstance: MockEventSource;
    global.EventSource = class extends MockEventSource {
      constructor(url: string) {
        super(url);
        eventSourceInstance = this;
      }
    } as unknown as typeof EventSource;

    subscribeToPoll("poll-channel-1", {
      onUpdate,
    });

    await new Promise((resolve) => setTimeout(resolve, 10));
    eventSourceInstance!.simulateOpen();

    // Send message for different channel
    eventSourceInstance!.simulateMessage(
      JSON.stringify({
        channel: "poll:poll-channel-2", // Different channel
        payload: {
          event: "poll:update",
          data: { pollInstanceId: "poll-channel-2" },
        },
      }),
    );

    expect(onUpdate).not.toHaveBeenCalled();
  });

  test("subscribeToPoll() cleanup function should unsubscribe", async () => {
    const { subscribeToPoll } = useWebSocket();

    const cleanup = subscribeToPoll("poll-cleanup-1", {
      onUpdate: vi.fn(),
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    // Clear previous fetch calls
    vi.clearAllMocks();

    // Call cleanup
    await cleanup();

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3333/api/v2/__transmit/unsubscribe",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          uid: "mock-uuid-123",
          channel: "poll:poll-cleanup-1",
        }),
      }),
    );
  });

  test("subscribeToStreamerPolls() should subscribe to streamer channel", async () => {
    const { subscribeToStreamerPolls } = useWebSocket();

    let eventSourceInstance: MockEventSource;
    global.EventSource = class extends MockEventSource {
      constructor(url: string) {
        super(url);
        eventSourceInstance = this;
      }
    } as unknown as typeof EventSource;

    subscribeToStreamerPolls("streamer-123", {
      onPollStart: vi.fn(),
      onPollEnd: vi.fn(),
    });

    await new Promise((resolve) => setTimeout(resolve, 10));
    eventSourceInstance!.simulateOpen();
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3333/api/v2/__transmit/subscribe",
      expect.objectContaining({
        body: JSON.stringify({
          uid: "mock-uuid-123",
          channel: "streamer:streamer-123:polls",
        }),
      }),
    );
  });

  test("subscribeToStreamerPolls() should handle poll:start events", async () => {
    const { subscribeToStreamerPolls } = useWebSocket();

    const onPollStart = vi.fn();

    let eventSourceInstance: MockEventSource;
    global.EventSource = class extends MockEventSource {
      constructor(url: string) {
        super(url);
        eventSourceInstance = this;
      }
    } as unknown as typeof EventSource;

    subscribeToStreamerPolls("streamer-456", {
      onPollStart,
    });

    await new Promise((resolve) => setTimeout(resolve, 10));
    eventSourceInstance!.simulateOpen();
    await new Promise((resolve) => setTimeout(resolve, 10));

    const startData = {
      pollInstanceId: "poll-789",
      question: "Streamer Poll?",
      options: ["A", "B"],
      durationSeconds: 30,
    };

    eventSourceInstance!.simulateMessage(
      JSON.stringify({
        channel: "streamer:streamer-456:polls",
        payload: {
          event: "poll:start",
          data: startData,
        },
      }),
    );

    expect(onPollStart).toHaveBeenCalledWith(startData);
  });

  test("subscribeToStreamerPolls() should handle streamer:joined-campaign events", async () => {
    const { subscribeToStreamerPolls } = useWebSocket();

    const onJoinedCampaign = vi.fn();

    let eventSourceInstance: MockEventSource;
    global.EventSource = class extends MockEventSource {
      constructor(url: string) {
        super(url);
        eventSourceInstance = this;
      }
    } as unknown as typeof EventSource;

    subscribeToStreamerPolls("streamer-789", {
      onJoinedCampaign,
    });

    await new Promise((resolve) => setTimeout(resolve, 10));
    eventSourceInstance!.simulateOpen();
    await new Promise((resolve) => setTimeout(resolve, 10));

    eventSourceInstance!.simulateMessage(
      JSON.stringify({
        channel: "streamer:streamer-789:polls",
        payload: {
          event: "streamer:joined-campaign",
          data: { campaign_id: "campaign-abc" },
        },
      }),
    );

    expect(onJoinedCampaign).toHaveBeenCalledWith({
      campaign_id: "campaign-abc",
    });
  });

  test("disconnect() should close SSE connection", () => {
    const { connect, disconnect, connected } = useWebSocket();

    connect();
    expect(connected.value).toBe(true);

    disconnect();
    expect(connected.value).toBe(false);
  });

  test("should handle malformed SSE messages gracefully", async () => {
    const { subscribeToPoll } = useWebSocket();

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    let eventSourceInstance: MockEventSource;
    global.EventSource = class extends MockEventSource {
      constructor(url: string) {
        super(url);
        eventSourceInstance = this;
      }
    } as unknown as typeof EventSource;

    subscribeToPoll("poll-malformed", {
      onUpdate: vi.fn(),
    });

    await new Promise((resolve) => setTimeout(resolve, 10));
    eventSourceInstance!.simulateOpen();

    // Send malformed JSON
    eventSourceInstance!.simulateMessage("{ invalid json");

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to parse SSE message"),
      expect.any(Error),
      "{ invalid json",
    );

    consoleErrorSpy.mockRestore();
  });

  test("should handle subscribe API errors", async () => {
    const { subscribeToPoll } = useWebSocket();

    let eventSourceInstance: MockEventSource;
    global.EventSource = class extends MockEventSource {
      constructor(url: string) {
        super(url);
        eventSourceInstance = this;
      }
    } as unknown as typeof EventSource;

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    subscribeToPoll("poll-error", {
      onUpdate: vi.fn(),
    });

    await new Promise((resolve) => setTimeout(resolve, 10));
    eventSourceInstance!.simulateOpen();

    // Mock failed subscribe AFTER opening connection
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => "Internal Server Error",
    } as Response);

    // Wait for subscribe call and error
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Error subscribing to channel"),
      expect.any(Error),
    );

    consoleErrorSpy.mockRestore();
  });
});
