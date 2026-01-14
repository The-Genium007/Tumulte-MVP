import { describe, test, expect, beforeEach, vi } from "vitest";
import { usePollInstance } from "~/composables/usePollInstance";
import { createMockPollInstance } from "../../helpers/mockFactory";

// Mock fetch globally
global.fetch = vi.fn();

describe("usePollInstance Composable", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock useRuntimeConfig
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked((globalThis as any).useRuntimeConfig).mockReturnValue({
      public: {
        apiBase: "http://localhost:3333/api/v2",
      },
    } as ReturnType<typeof useRuntimeConfig>);
  });

  test("fetchPollInstance() should fetch poll instance details", async () => {
    const mockPollInstance = createMockPollInstance({
      id: "poll-instance-123",
      pollId: "poll-123",
      status: "RUNNING",
      startedAt: "2024-01-01T00:00:00Z",
    });

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

  test("fetchPollInstance() should handle 404 errors", async () => {
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

  test("fetchPollInstance() should handle network errors", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

    const { fetchPollInstance } = usePollInstance();

    await expect(fetchPollInstance("poll-instance-123")).rejects.toThrow(
      "Network error",
    );
  });

  test("fetchPollInstance() should return ended poll instance with results", async () => {
    const mockPollInstance = createMockPollInstance({
      id: "poll-instance-456",
      pollId: "poll-456",
      status: "ENDED",
      startedAt: "2024-01-01T00:00:00Z",
      endedAt: "2024-01-01T00:01:00Z",
      finalTotalVotes: 100,
      finalVotesByOption: { "0": 60, "1": 40 },
    });

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockPollInstance }),
    } as Response);

    const { fetchPollInstance } = usePollInstance();
    const result = await fetchPollInstance("poll-instance-456");

    expect(result.status).toBe("ENDED");
    expect(result.finalTotalVotes).toBe(100);
    expect(result.finalVotesByOption).toEqual({ "0": 60, "1": 40 });
  });
});
