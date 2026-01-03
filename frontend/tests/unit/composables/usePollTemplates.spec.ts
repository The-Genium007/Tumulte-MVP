/* eslint-disable camelcase */
// API expects snake_case for duration_seconds
import { describe, test, expect, beforeEach, vi } from "vitest";
import { usePollTemplates } from "~/composables/usePollTemplates";
import { createMockPollTemplate } from "../../helpers/mockFactory";

// Mock fetch globally
global.fetch = vi.fn();

describe("usePollTemplates Composable", () => {
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

  test("should initialize with empty state", () => {
    const { templates, loading } = usePollTemplates();

    expect(templates.value).toEqual([]);
    expect(loading.value).toBe(false);
  });

  test("fetchTemplates() should load templates list", async () => {
    const mockTemplates = [
      createMockPollTemplate({ id: "1", label: "Template 1" }),
      createMockPollTemplate({ id: "2", label: "Template 2" }),
    ];

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockTemplates }),
    } as Response);

    const { fetchTemplates, templates } = usePollTemplates();
    await fetchTemplates();

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3333/api/v2/mj/poll-templates",
      { credentials: "include" },
    );
    expect(templates.value).toEqual(mockTemplates);
  });

  test("fetchTemplates() should load templates for specific campaign", async () => {
    const mockTemplates = [
      createMockPollTemplate({ id: "1", campaignId: "campaign-123" }),
    ];

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockTemplates }),
    } as Response);

    const { fetchTemplates, templates } = usePollTemplates();
    await fetchTemplates("campaign-123");

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3333/api/v2/mj/campaigns/campaign-123/templates",
      { credentials: "include" },
    );
    expect(templates.value).toEqual(mockTemplates);
  });

  test("fetchTemplates() should handle errors", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const { fetchTemplates } = usePollTemplates();

    await expect(fetchTemplates()).rejects.toThrow("Failed to fetch templates");

    consoleErrorSpy.mockRestore();
  });

  test("fetchTemplates() should set loading state correctly", async () => {
    const mockTemplates = [createMockPollTemplate()];
    let resolveFetch: ((value: Response) => void) | undefined;
    const fetchPromise = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });

    vi.mocked(fetch).mockReturnValueOnce(fetchPromise as Promise<Response>);

    const { fetchTemplates, loading } = usePollTemplates();
    const fetchPromiseResult = fetchTemplates();

    // Loading should be true while fetching
    expect(loading.value).toBe(true);

    // Resolve the fetch
    if (resolveFetch) {
      resolveFetch({
        ok: true,
        json: async () => ({ data: mockTemplates }),
      } as Response);
    }

    await fetchPromiseResult;

    // Loading should be false after fetch completes
    expect(loading.value).toBe(false);
  });

  test("createTemplate() should create new template and add to list", async () => {
    const newTemplate = createMockPollTemplate({
      label: "New Template",
      title: "Test Question",
    });

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: newTemplate }),
    } as Response);

    const { createTemplate, templates } = usePollTemplates();
    const result = await createTemplate({
      label: "New Template",
      title: "Test Question",
      options: ["Option 1", "Option 2"],
      duration_seconds: 60,
    });

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3333/api/v2/mj/poll-templates",
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: "New Template",
          title: "Test Question",
          options: ["Option 1", "Option 2"],
          duration_seconds: 60,
        }),
      },
    );
    expect(result).toEqual(newTemplate);
    expect(templates.value).toContainEqual(newTemplate);
  });

  test("createTemplate() should create template for specific campaign", async () => {
    const newTemplate = createMockPollTemplate({
      campaignId: "campaign-456",
    });

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: newTemplate }),
    } as Response);

    const { createTemplate } = usePollTemplates();
    await createTemplate(
      {
        label: "Campaign Template",
        title: "Test",
        options: ["A", "B"],
        duration_seconds: 30,
      },
      "campaign-456",
    );

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3333/api/v2/mj/campaigns/campaign-456/templates",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  test("createTemplate() should handle errors", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 400,
    } as Response);

    const { createTemplate } = usePollTemplates();

    await expect(
      createTemplate({
        label: "Test",
        title: "Test",
        options: [],
        duration_seconds: 60,
      }),
    ).rejects.toThrow("Failed to create template");
  });

  test("updateTemplate() should update existing template", async () => {
    const existingTemplate = createMockPollTemplate({
      id: "1",
      label: "Old Label",
    });
    const updatedTemplate = createMockPollTemplate({
      id: "1",
      label: "New Label",
    });

    // First load templates
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [existingTemplate] }),
    } as Response);

    const { fetchTemplates, updateTemplate, templates } = usePollTemplates();
    await fetchTemplates();

    // Then update
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: updatedTemplate }),
    } as Response);

    const result = await updateTemplate("1", { label: "New Label" });

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3333/api/v2/mj/poll-templates/1",
      {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: "New Label" }),
      },
    );
    expect(result).toEqual(updatedTemplate);
    expect(templates.value[0].label).toBe("New Label");
  });

  test("updateTemplate() should update template for specific campaign", async () => {
    const updatedTemplate = createMockPollTemplate({
      id: "1",
      campaignId: "campaign-789",
    });

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: updatedTemplate }),
    } as Response);

    const { updateTemplate } = usePollTemplates();
    await updateTemplate("1", { label: "Updated" }, "campaign-789");

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3333/api/v2/mj/campaigns/campaign-789/templates/1",
      expect.objectContaining({
        method: "PUT",
      }),
    );
  });

  test("updateTemplate() should handle errors", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as Response);

    const { updateTemplate } = usePollTemplates();

    await expect(updateTemplate("1", { label: "Test" })).rejects.toThrow(
      "Failed to update template",
    );
  });

  test("deleteTemplate() should remove template from list", async () => {
    const template1 = createMockPollTemplate({ id: "1", label: "Template 1" });
    const template2 = createMockPollTemplate({ id: "2", label: "Template 2" });

    // First load templates
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [template1, template2] }),
    } as Response);

    const { fetchTemplates, deleteTemplate, templates } = usePollTemplates();
    await fetchTemplates();

    // Then delete
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
    } as Response);

    await deleteTemplate("1");

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3333/api/v2/mj/poll-templates/1",
      {
        method: "DELETE",
        credentials: "include",
      },
    );
    expect(templates.value).toHaveLength(1);
    expect(templates.value[0].id).toBe("2");
  });

  test("deleteTemplate() should delete template for specific campaign", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
    } as Response);

    const { deleteTemplate } = usePollTemplates();
    await deleteTemplate("1", "campaign-xyz");

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3333/api/v2/mj/campaigns/campaign-xyz/templates/1",
      expect.objectContaining({
        method: "DELETE",
      }),
    );
  });

  test("deleteTemplate() should handle errors", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 403,
    } as Response);

    const { deleteTemplate } = usePollTemplates();

    await expect(deleteTemplate("1")).rejects.toThrow(
      "Failed to delete template",
    );
  });

  test("launchPoll() should launch poll from template", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    const { launchPoll } = usePollTemplates();
    await launchPoll("template-123");

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3333/api/v2/mj/polls/launch",
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template_id: "template-123" }),
      },
    );
  });

  test("launchPoll() should launch poll for specific campaign", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    const { launchPoll } = usePollTemplates();
    await launchPoll("template-456", "campaign-abc");

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3333/api/v2/mj/campaigns/campaign-abc/polls/launch",
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template_id: "template-456" }),
      },
    );
  });

  test("launchPoll() should handle errors", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 403,
    } as Response);

    const { launchPoll } = usePollTemplates();

    await expect(launchPoll("template-789")).rejects.toThrow(
      "Failed to launch poll",
    );
  });
});
