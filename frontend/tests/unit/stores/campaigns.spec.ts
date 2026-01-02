import { describe, test, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useCampaignsStore } from "~/stores/campaigns";
import { createMockCampaign } from "../../helpers/mockFactory";

// Mock campaigns repository
vi.mock("~/api/repositories/campaigns_repository", () => ({
  campaignsRepository: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    inviteStreamer: vi.fn(),
    removeMember: vi.fn(),
  },
}));

describe("Campaigns Store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  test("should initialize with empty campaigns", () => {
    const store = useCampaignsStore();

    expect(store.campaigns).toEqual([]);
    expect(store.selectedCampaign).toBeNull();
    expect(store.loading).toBe(false);
  });

  test("fetchCampaigns() should load campaigns list", async () => {
    const mockCampaigns = [
      createMockCampaign({ id: "1", name: "Campaign 1" }),
      createMockCampaign({ id: "2", name: "Campaign 2" }),
    ];

    const { campaignsRepository } =
      await import("~/api/repositories/campaigns_repository");
    vi.mocked(campaignsRepository.list).mockResolvedValueOnce(mockCampaigns);

    const store = useCampaignsStore();
    await store.fetchCampaigns();

    expect(campaignsRepository.list).toHaveBeenCalled();
    expect(store.campaigns).toEqual(mockCampaigns);
    expect(store.loading).toBe(false);
  });

  test("fetchCampaigns() should handle errors", async () => {
    const { campaignsRepository } =
      await import("~/api/repositories/campaigns_repository");
    vi.mocked(campaignsRepository.list).mockRejectedValueOnce(
      new Error("Network error"),
    );

    const store = useCampaignsStore();

    await expect(store.fetchCampaigns()).rejects.toThrow("Network error");
    expect(store.loading).toBe(false);
  });

  test("createCampaign() should create and add to list", async () => {
    const newCampaign = createMockCampaign({ id: "new", name: "New Campaign" });

    const { campaignsRepository } =
      await import("~/api/repositories/campaigns_repository");
    vi.mocked(campaignsRepository.create).mockResolvedValueOnce(newCampaign);

    const store = useCampaignsStore();
    const result = await store.createCampaign({
      name: "New Campaign",
      description: "Test",
    });

    expect(campaignsRepository.create).toHaveBeenCalledWith({
      name: "New Campaign",
      description: "Test",
    });
    expect(result).toEqual(newCampaign);
    expect(store.campaigns).toContainEqual(newCampaign);
  });

  test("updateCampaign() should update campaign in list", async () => {
    const existing = createMockCampaign({ id: "1", name: "Old Name" });
    const updated = createMockCampaign({ id: "1", name: "New Name" });

    const { campaignsRepository } =
      await import("~/api/repositories/campaigns_repository");
    vi.mocked(campaignsRepository.list).mockResolvedValueOnce([existing]);
    vi.mocked(campaignsRepository.update).mockResolvedValueOnce(updated);

    const store = useCampaignsStore();
    await store.fetchCampaigns();
    await store.updateCampaign("1", { name: "New Name" });

    expect(store.campaigns[0].name).toBe("New Name");
  });

  test("deleteCampaign() should remove from list", async () => {
    const campaign1 = createMockCampaign({ id: "1" });
    const campaign2 = createMockCampaign({ id: "2" });

    const { campaignsRepository } =
      await import("~/api/repositories/campaigns_repository");
    vi.mocked(campaignsRepository.list).mockResolvedValueOnce([
      campaign1,
      campaign2,
    ]);
    vi.mocked(campaignsRepository.delete).mockResolvedValueOnce(undefined);

    const store = useCampaignsStore();
    await store.fetchCampaigns();
    await store.deleteCampaign("1");

    expect(store.campaigns).toHaveLength(1);
    expect(store.campaigns[0].id).toBe("2");
  });

  test("deleteCampaign() should clear selectedCampaign if same", async () => {
    const campaign = createMockCampaign({ id: "1" });

    const { campaignsRepository } =
      await import("~/api/repositories/campaigns_repository");
    vi.mocked(campaignsRepository.get).mockResolvedValueOnce(
      campaign as unknown as Awaited<
        ReturnType<typeof campaignsRepository.get>
      >,
    );
    vi.mocked(campaignsRepository.delete).mockResolvedValueOnce(undefined);

    const store = useCampaignsStore();
    await store.fetchCampaign("1");
    await store.deleteCampaign("1");

    expect(store.selectedCampaign).toBeNull();
  });

  test("activeCampaigns getter should filter campaigns", async () => {
    const { campaignsRepository } =
      await import("~/api/repositories/campaigns_repository");
    const mockCampaigns = [
      createMockCampaign({ id: "1", activeMemberCount: 3 }),
      createMockCampaign({ id: "2", activeMemberCount: 0 }),
      createMockCampaign({ id: "3", activeMemberCount: 5 }),
    ];
    vi.mocked(campaignsRepository.list).mockResolvedValueOnce(mockCampaigns);

    const store = useCampaignsStore();
    await store.fetchCampaigns();

    expect(store.activeCampaigns).toHaveLength(2);
    expect(store.activeCampaigns.map((c) => c.id)).toEqual(["1", "3"]);
  });

  test("hasCampaigns getter should return true when campaigns exist", async () => {
    const { campaignsRepository } =
      await import("~/api/repositories/campaigns_repository");
    const mockCampaigns = [createMockCampaign()];
    vi.mocked(campaignsRepository.list).mockResolvedValueOnce(mockCampaigns);

    const store = useCampaignsStore();

    expect(store.hasCampaigns).toBe(false);

    await store.fetchCampaigns();

    expect(store.hasCampaigns).toBe(true);
  });
});
