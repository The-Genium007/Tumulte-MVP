import { describe, test, expect, beforeEach, vi } from "vitest";
import { useCampaigns } from "~/composables/useCampaigns";
import { createMockCampaign } from "../../helpers/mockFactory";

// Mock fetch globally
global.fetch = vi.fn();

describe("useCampaigns Composable", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock useRuntimeConfig
    vi.mocked(globalThis.useRuntimeConfig).mockReturnValue({
      public: {
        apiBase: "http://localhost:3333/api/v2",
      },
    } as ReturnType<typeof useRuntimeConfig>);
  });

  test("should initialize with empty state", () => {
    const { campaigns, selectedCampaign, loading } = useCampaigns();

    expect(campaigns.value).toEqual([]);
    expect(selectedCampaign.value).toBeNull();
    expect(loading.value).toBe(false);
  });

  test("fetchCampaigns() should load campaigns list", async () => {
    const mockCampaigns = [
      createMockCampaign({ id: "1", name: "Campaign 1" }),
      createMockCampaign({ id: "2", name: "Campaign 2" }),
    ];

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockCampaigns }),
    } as Response);

    const { fetchCampaigns, campaigns } = useCampaigns();
    await fetchCampaigns();

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3333/api/v2/mj/campaigns",
      { credentials: "include" },
    );
    expect(campaigns.value).toEqual(mockCampaigns);
  });

  test("fetchCampaigns() should handle errors", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const { fetchCampaigns } = useCampaigns();

    await expect(fetchCampaigns()).rejects.toThrow("Failed to fetch campaigns");

    consoleErrorSpy.mockRestore();
  });

  test("fetchCampaigns() should set loading state correctly", async () => {
    const mockCampaigns = [createMockCampaign()];
    let resolveFetch: ((value: Response) => void) | undefined;
    const fetchPromise = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });

    vi.mocked(fetch).mockReturnValueOnce(fetchPromise as Promise<Response>);

    const { fetchCampaigns, loading } = useCampaigns();
    const fetchPromiseResult = fetchCampaigns();

    // Loading should be true while fetching
    expect(loading.value).toBe(true);

    // Resolve the fetch
    if (resolveFetch) {
      resolveFetch({
        ok: true,
        json: async () => ({ data: mockCampaigns }),
      } as Response);
    }

    await fetchPromiseResult;

    // Loading should be false after fetch completes
    expect(loading.value).toBe(false);
  });

  test("createCampaign() should create new campaign and add to list", async () => {
    const newCampaign = createMockCampaign({
      name: "New Campaign",
      description: "Test description",
    });

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: newCampaign }),
    } as Response);

    const { createCampaign, campaigns } = useCampaigns();
    const result = await createCampaign({
      name: "New Campaign",
      description: "Test description",
    });

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3333/api/v2/mj/campaigns",
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "New Campaign",
          description: "Test description",
        }),
      },
    );
    expect(result).toEqual(newCampaign);
    expect(campaigns.value).toContainEqual(newCampaign);
  });

  test("createCampaign() should handle errors", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 400,
    } as Response);

    const { createCampaign } = useCampaigns();

    await expect(createCampaign({ name: "Test" })).rejects.toThrow(
      "Failed to create campaign",
    );
  });

  test("updateCampaign() should update existing campaign", async () => {
    const existingCampaign = createMockCampaign({
      id: "1",
      name: "Old Name",
    });
    const updatedCampaign = createMockCampaign({
      id: "1",
      name: "New Name",
    });

    // First load campaigns
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [existingCampaign] }),
    } as Response);

    const { fetchCampaigns, updateCampaign, campaigns } = useCampaigns();
    await fetchCampaigns();

    // Then update
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: updatedCampaign }),
    } as Response);

    const result = await updateCampaign("1", { name: "New Name" });

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3333/api/v2/mj/campaigns/1",
      {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Name" }),
      },
    );
    expect(result).toEqual(updatedCampaign);
    expect(campaigns.value[0].name).toBe("New Name");
  });

  test("updateCampaign() should handle errors", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as Response);

    const { updateCampaign } = useCampaigns();

    await expect(updateCampaign("1", { name: "Test" })).rejects.toThrow(
      "Failed to update campaign",
    );
  });

  test("deleteCampaign() should remove campaign from list", async () => {
    const campaign1 = createMockCampaign({ id: "1", name: "Campaign 1" });
    const campaign2 = createMockCampaign({ id: "2", name: "Campaign 2" });

    // First load campaigns
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [campaign1, campaign2] }),
    } as Response);

    const { fetchCampaigns, deleteCampaign, campaigns } = useCampaigns();
    await fetchCampaigns();

    // Then delete
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
    } as Response);

    await deleteCampaign("1");

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3333/api/v2/mj/campaigns/1",
      {
        method: "DELETE",
        credentials: "include",
      },
    );
    expect(campaigns.value).toHaveLength(1);
    expect(campaigns.value[0].id).toBe("2");
  });

  test("deleteCampaign() should clear selectedCampaign if deleted", async () => {
    const campaign = createMockCampaign({ id: "1" });

    // First load campaigns
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [campaign] }),
    } as Response);

    const { fetchCampaigns, deleteCampaign, selectedCampaign } = useCampaigns();
    await fetchCampaigns();

    // Select the campaign
    selectedCampaign.value = campaign;

    // Then delete
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
    } as Response);

    await deleteCampaign("1");

    expect(selectedCampaign.value).toBeNull();
  });

  test("deleteCampaign() should handle errors", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 403,
    } as Response);

    const { deleteCampaign } = useCampaigns();

    await expect(deleteCampaign("1")).rejects.toThrow(
      "Failed to delete campaign",
    );
  });

  test("searchTwitchStreamers() should search and return streamers", async () => {
    const mockStreamers = [
      {
        twitchUserId: "123",
        twitchUsername: "streamer1",
        twitchDisplayName: "Streamer 1",
        profileImageUrl: "https://example.com/1.png",
      },
    ];

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockStreamers }),
    } as Response);

    const { searchTwitchStreamers } = useCampaigns();
    const result = await searchTwitchStreamers("streamer1");

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3333/api/v2/mj/streamers/search?q=streamer1",
      { credentials: "include" },
    );
    expect(result).toEqual([
      {
        id: "123",
        login: "streamer1",
        displayName: "Streamer 1",
        profileImageUrl: "https://example.com/1.png",
      },
    ]);
  });

  // TODO: Add more tests for other methods
  // - getCampaignMembers()
  // - getCampaignDetails()
  // - inviteStreamer()
  // - removeMember()
  // - fetchInvitations()
  // - acceptInvitation()
  // - declineInvitation()
  // - fetchActiveCampaigns()
  // - leaveCampaign()
  // - grantAuthorization()
  // - revokeAuthorization()
  // - getAuthorizationStatus()
});
