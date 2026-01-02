import { describe, test, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useSessionPollsStore } from "~/stores/sessionPolls";

// Mock fetch globally
global.fetch = vi.fn();

describe("SessionPolls Store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();

    // Mock useRuntimeConfig
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked((globalThis as any).useRuntimeConfig).mockReturnValue({
      public: {
        apiBase: "http://localhost:3333/api/v2",
      },
    } as ReturnType<typeof useRuntimeConfig>);
  });

  test("should initialize with empty polls", () => {
    const store = useSessionPollsStore();

    expect(store.polls).toEqual([]);
    expect(store.loading).toBe(false);
  });

  test("fetchPolls() should load session polls", async () => {
    const mockPolls = [
      {
        id: "poll-1",
        question: "Question 1?",
        options: ["A", "B"],
        type: "UNIQUE",
        created_at: "2024-01-01",
      },
      {
        id: "poll-2",
        question: "Question 2?",
        options: ["C", "D"],
        type: "STANDARD",
        created_at: "2024-01-02",
      },
    ];

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { polls: mockPolls } }),
    } as Response);

    const store = useSessionPollsStore();
    await store.fetchPolls("campaign-123", "session-456");

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3333/api/v2/mj/sessions/session-456",
      { credentials: "include" },
    );
    expect(store.polls).toEqual(mockPolls);
    expect(store.loading).toBe(false);
  });

  test("fetchPolls() should handle errors", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);

    const store = useSessionPollsStore();
    await store.fetchPolls("campaign-123", "session-456");

    expect(store.polls).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  test("fetchPolls() should set loading state", async () => {
    let resolveFetch: ((value: Response) => void) | undefined;
    const fetchPromise = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });

    vi.mocked(fetch).mockReturnValueOnce(fetchPromise as Promise<Response>);

    const store = useSessionPollsStore();
    const fetchPromiseResult = store.fetchPolls("campaign-123", "session-456");

    expect(store.loading).toBe(true);

    if (resolveFetch) {
      resolveFetch({
        ok: true,
        json: async () => ({ data: { polls: [] } }),
      } as Response);
    }

    await fetchPromiseResult;
    expect(store.loading).toBe(false);
  });

  test("addPoll() should add new poll", async () => {
    const newPoll = {
      id: "poll-new",
      question: "New Poll?",
      options: ["Yes", "No"],
      type: "UNIQUE" as const,
      created_at: "2024-01-03",
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: newPoll }),
    } as Response);

    const store = useSessionPollsStore();
    const result = await store.addPoll("campaign-123", "session-456", {
      question: "New Poll?",
      options: ["Yes", "No"],
      type: "UNIQUE",
    });

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3333/api/v2/mj/sessions/session-456/polls",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(result).toEqual(newPoll);
    expect(store.polls).toContainEqual(newPoll);
  });

  test("addPoll() should include channel points if enabled", async () => {
    const newPoll = {
      id: "poll-cp",
      question: "Channel Points Poll?",
      options: ["A", "B"],
      type: "STANDARD" as const,
      created_at: "2024-01-04",
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: newPoll }),
    } as Response);

    const store = useSessionPollsStore();
    await store.addPoll("campaign-123", "session-456", {
      question: "Channel Points Poll?",
      options: ["A", "B"],
      type: "STANDARD",
      channelPointsEnabled: true,
      channelPointsAmount: 100,
    });

    const callBody = JSON.parse(
      vi.mocked(fetch).mock.calls[0][1]?.body as string,
    );
    expect(callBody.channelPointsEnabled).toBe(true);
    expect(callBody.channelPointsAmount).toBe(100);
  });

  test("addPoll() should handle errors", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 400,
    } as Response);

    const store = useSessionPollsStore();

    await expect(
      store.addPoll("campaign-123", "session-456", {
        question: "Invalid?",
        options: [],
        type: "UNIQUE",
      }),
    ).rejects.toThrow("Failed to add poll");

    consoleErrorSpy.mockRestore();
  });

  test("deletePoll() should remove poll from list", async () => {
    // Setup: add polls first
    const mockPolls = [
      {
        id: "poll-1",
        question: "Q1?",
        options: ["A"],
        type: "UNIQUE" as const,
        created_at: "2024-01-01",
      },
      {
        id: "poll-2",
        question: "Q2?",
        options: ["B"],
        type: "STANDARD" as const,
        created_at: "2024-01-02",
      },
    ];

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { polls: mockPolls } }),
    } as Response);

    const store = useSessionPollsStore();
    await store.fetchPolls("campaign-123", "session-456");

    // Delete
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
    } as Response);

    await store.deletePoll("campaign-123", "session-456", "poll-1");

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3333/api/v2/mj/sessions/session-456/polls/poll-1",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(store.polls.length).toBe(1);
    expect(store.polls[0].id).toBe("poll-2");
  });

  test("deletePoll() should handle errors", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as Response);

    const store = useSessionPollsStore();

    await expect(
      store.deletePoll("campaign-123", "session-456", "invalid-id"),
    ).rejects.toThrow("Failed to delete poll");

    consoleErrorSpy.mockRestore();
  });

  test("clearPolls() should clear all polls", () => {
    const store = useSessionPollsStore();

    // Add some polls manually
    store.polls.push({
      id: "poll-1",
      question: "Q?",
      options: ["A"],
      type: "UNIQUE",
      created_at: "2024-01-01",
    });

    expect(store.polls.length).toBe(1);

    store.clearPolls();

    expect(store.polls).toEqual([]);
  });
});
