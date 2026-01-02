import { describe, test, expect, beforeEach, vi } from "vitest";
import { usePollInstance } from "~/composables/usePollInstance";

// Mock fetch globally
global.fetch = vi.fn();

describe("usePollInstance Composable", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock useRuntimeConfig
    vi.mocked(globalThis.useRuntimeConfig).mockReturnValue({
      public: {
        apiBase: "http://localhost:3333/api/v2",
      },
    } as ReturnType<typeof useRuntimeConfig>);
  });

  test("fetchPollInstance() should fetch poll details", async () => {
    const mockPollInstance = {
      id: "poll-instance-123",
      templateId: "template-123",
      status: "RUNNING",
      startedAt: "2024-01-01T00:00:00Z",
      endsAt: "2024-01-01T00:01:00Z",
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockPollInstance }),
    } as Response);

    const { fetchPollInstance } = usePollInstance();
    const result = await fetchPollInstance("poll-instance-123");

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3333/api/v2/mj/polls/poll-instance-123",
      { credentials: "include" },
    );
    expect(result).toEqual(mockPollInstance);
  });

  test("fetchPollInstance() should handle errors", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
    } as Response);

    const { fetchPollInstance } = usePollInstance();

    await expect(fetchPollInstance("invalid-id")).rejects.toThrow(
      "Failed to fetch poll instance: Not Found",
    );
  });

  test("fetchActiveSession() should fetch active session", async () => {
    const mockSession = {
      id: "session-123",
      campaignId: "campaign-123",
      status: "ACTIVE",
      startedAt: "2024-01-01T00:00:00Z",
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockSession }),
    } as Response);

    const { fetchActiveSession } = usePollInstance();
    const result = await fetchActiveSession();

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3333/api/v2/mj/active-session",
      { credentials: "include" },
    );
    expect(result).toEqual(mockSession);
  });

  test("fetchActiveSession() should handle errors", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "No active session",
    } as Response);

    const { fetchActiveSession } = usePollInstance();

    await expect(fetchActiveSession()).rejects.toThrow(
      "Failed to fetch active session: No active session",
    );
  });

  test("fetchActiveSession() should handle network errors", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

    const { fetchActiveSession } = usePollInstance();

    await expect(fetchActiveSession()).rejects.toThrow("Network error");
  });
});
