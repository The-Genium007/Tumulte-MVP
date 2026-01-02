import { describe, test, expect, beforeEach, vi, afterEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { usePollControlStore } from "~/stores/pollControl";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get store() {
      return store;
    },
  };
})();

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
});

describe("Poll Control Store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  test("should initialize with default state", () => {
    const store = usePollControlStore();

    expect(store.activeSession).toBeNull();
    expect(store.activeSessionPolls).toEqual([]);
    expect(store.currentPollIndex).toBe(0);
    expect(store.pollStatus).toBe("idle");
    expect(store.countdown).toBe(0);
    expect(store.pollResults).toBeNull();
    expect(store.launchedPolls).toEqual([]);
    expect(store.pollStartTime).toBeNull();
    expect(store.pollDuration).toBeNull();
    expect(store.currentPollInstanceId).toBeNull();
    expect(store.pollStates).toEqual({});
  });

  test("saveState() should persist state to localStorage", async () => {
    const store = usePollControlStore();

    // Set some state
    store.activeSession = { id: "session-123" };
    store.activeSessionPolls = [{ id: "poll-1" }, { id: "poll-2" }];
    store.currentPollIndex = 1;
    store.pollStatus = "running";
    store.pollResults = {
      results: [
        { option: "Option 1", votes: 10 },
        { option: "Option 2", votes: 5 },
      ],
      totalVotes: 15,
    };

    // Wait for initialization flag to be cleared
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Manually call saveState
    store.saveState();

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "pollControl",
      expect.any(String),
    );

    // Verify saved data structure
    const savedData = JSON.parse(
      localStorageMock.getItem("pollControl") as string,
    );
    expect(savedData.activeSession).toEqual({ id: "session-123" });
    expect(savedData.currentPollIndex).toBe(1);
    expect(savedData.pollStatus).toBe("running");
    expect(savedData.pollResults).toEqual({
      results: [
        { option: "Option 1", votes: 10 },
        { option: "Option 2", votes: 5 },
      ],
      totalVotes: 15,
    });
    expect(savedData.timestamp).toBeTypeOf("number");
  });

  test("loadState() should restore state from localStorage", () => {
    // Prepare localStorage data
    const mockState = {
      activeSession: { id: "session-456" },
      activeSessionPolls: [{ id: "poll-3" }],
      currentPollIndex: 2,
      pollStatus: "sent",
      countdown: 0,
      pollResults: {
        results: [{ option: "Option A", votes: 20 }],
        totalVotes: 20,
      },
      launchedPolls: [0, 1],
      pollStartTime: Date.now() - 60000,
      pollDuration: 60,
      currentPollInstanceId: "instance-789",
      pollStates: {
        0: {
          status: "sent",
          results: null,
          instanceId: "instance-1",
          startTime: null,
          duration: null,
        },
      },
      timestamp: Date.now(),
    };

    localStorageMock.setItem("pollControl", JSON.stringify(mockState));

    // Create store (loadState is called automatically)
    const store = usePollControlStore();

    expect(store.activeSession).toEqual({ id: "session-456" });
    expect(store.activeSessionPolls).toEqual([{ id: "poll-3" }]);
    expect(store.currentPollIndex).toBe(2);
    expect(store.pollStatus).toBe("sent");
    expect(store.pollResults).toEqual({
      results: [{ option: "Option A", votes: 20 }],
      totalVotes: 20,
    });
    expect(store.launchedPolls).toEqual([0, 1]);
    expect(store.currentPollInstanceId).toBe("instance-789");
    expect(store.pollStates).toHaveProperty("0");
  });

  test("loadState() should remove expired data (older than 24 hours)", () => {
    const expiredState = {
      activeSession: { id: "old-session" },
      activeSessionPolls: [],
      currentPollIndex: 0,
      pollStatus: "idle",
      countdown: 0,
      pollResults: null,
      launchedPolls: [],
      pollStartTime: null,
      pollDuration: null,
      currentPollInstanceId: null,
      pollStates: {},
      timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
    };

    localStorageMock.setItem("pollControl", JSON.stringify(expiredState));

    // Create store (loadState is called automatically)
    const store = usePollControlStore();

    // State should be reset to defaults (not loaded from expired data)
    expect(store.activeSession).toBeNull();
    expect(localStorageMock.removeItem).toHaveBeenCalledWith("pollControl");
  });

  test("clearState() should reset all state and clear localStorage", async () => {
    const store = usePollControlStore();

    // Set some state
    store.activeSession = { id: "session-123" };
    store.pollStatus = "running";
    store.pollResults = {
      results: [{ option: "Option 1", votes: 10 }],
      totalVotes: 10,
    };

    // Wait for initialization
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Clear state
    store.clearState();

    expect(store.activeSession).toBeNull();
    expect(store.activeSessionPolls).toEqual([]);
    expect(store.currentPollIndex).toBe(0);
    expect(store.pollStatus).toBe("idle");
    expect(store.countdown).toBe(0);
    expect(store.pollResults).toBeNull();
    expect(store.launchedPolls).toEqual([]);
    expect(store.pollStartTime).toBeNull();
    expect(store.pollDuration).toBeNull();
    expect(store.currentPollInstanceId).toBeNull();
    expect(store.pollStates).toEqual({});
    expect(localStorageMock.removeItem).toHaveBeenCalledWith("pollControl");
  });

  test("saveCurrentPollState() should save poll state by index", () => {
    const store = usePollControlStore();

    store.currentPollIndex = 0;
    store.pollStatus = "running";
    store.pollResults = {
      results: [{ option: "Option 1", votes: 5 }],
      totalVotes: 5,
    };
    store.currentPollInstanceId = "instance-123";
    store.pollStartTime = Date.now();
    store.pollDuration = 60;

    store.saveCurrentPollState();

    expect(store.pollStates[0]).toEqual({
      status: "running",
      results: {
        results: [{ option: "Option 1", votes: 5 }],
        totalVotes: 5,
      },
      instanceId: "instance-123",
      startTime: expect.any(Number),
      duration: 60,
    });
  });

  test("restorePollState() should restore poll state by index", () => {
    const store = usePollControlStore();

    // Save state for poll index 1
    store.pollStates = {
      1: {
        status: "sent",
        results: {
          results: [{ option: "Option A", votes: 15 }],
          totalVotes: 15,
        },
        instanceId: "instance-456",
        startTime: null,
        duration: null,
      },
    };

    // Restore poll state for index 1
    store.restorePollState(1);

    expect(store.pollStatus).toBe("sent");
    expect(store.pollResults).toEqual({
      results: [{ option: "Option A", votes: 15 }],
      totalVotes: 15,
    });
    expect(store.currentPollInstanceId).toBe("instance-456");
    expect(store.countdown).toBe(0);
  });

  test("restorePollState() should reset to idle if no saved state exists", () => {
    const store = usePollControlStore();

    // Set some current state
    store.pollStatus = "running";
    store.pollResults = {
      results: [{ option: "Option 1", votes: 10 }],
      totalVotes: 10,
    };

    // Try to restore poll index 5 (doesn't exist)
    store.restorePollState(5);

    expect(store.pollStatus).toBe("idle");
    expect(store.pollResults).toBeNull();
    expect(store.currentPollInstanceId).toBeNull();
    expect(store.pollStartTime).toBeNull();
    expect(store.pollDuration).toBeNull();
    expect(store.countdown).toBe(0);
  });

  test("should automatically save state when activeSession changes", async () => {
    const store = usePollControlStore();

    // Wait for initialization flag to be cleared
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Clear previous calls
    vi.clearAllMocks();

    // Change activeSession
    store.activeSession = { id: "new-session" };

    // Wait for watcher to trigger
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Should have saved to localStorage
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "pollControl",
      expect.any(String),
    );
  });

  test("should remove localStorage when activeSession is cleared", async () => {
    const store = usePollControlStore();

    // Set activeSession first
    store.activeSession = { id: "session-123" };

    // Wait for initialization
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Clear previous calls
    vi.clearAllMocks();

    // Clear activeSession
    store.activeSession = null;

    // Wait for watcher to trigger
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Should have removed from localStorage
    expect(localStorageMock.removeItem).toHaveBeenCalledWith("pollControl");
  });
});
