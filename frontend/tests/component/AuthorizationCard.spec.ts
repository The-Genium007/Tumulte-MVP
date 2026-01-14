import { describe, test, expect, beforeEach, vi, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import AuthorizationCard from "~/components/AuthorizationCard.vue";

// Mock Nuxt UI components
const mockComponents = {
  UAlert: {
    template: '<div class="u-alert"><slot name="description" /></div>',
    props: ["color", "variant", "icon"],
  },
  UButton: {
    template:
      '<button class="u-button" @click="$emit(\'click\')">{{ label }}<slot /></button>',
    props: ["label", "color", "variant", "icon", "size", "block"],
    emits: ["click"],
  },
  UIcon: {
    template: '<i class="u-icon" :class="name"></i>',
    props: ["name"],
  },
  UModal: {
    template: '<div class="u-modal" v-if="open"><slot name="content" /></div>',
    props: ["open"],
  },
  UCard: {
    template:
      '<div class="u-card"><slot name="header" /><slot /><slot name="footer" /></div>',
    props: [],
  },
};

describe("AuthorizationCard Component", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("should render info alert", () => {
    const wrapper = mount(AuthorizationCard, {
      props: {
        campaignId: "campaign-123",
        isAuthorized: false,
        expiresAt: null,
        remainingSeconds: null,
      },
      global: {
        components: mockComponents,
      },
    });

    expect(wrapper.text()).toContain(
      "Autorisez Tumulte à lancer des sondages sur votre chaîne pour cette campagne pendant 12 heures",
    );
  });

  test("should show authorize button when not authorized", () => {
    const wrapper = mount(AuthorizationCard, {
      props: {
        campaignId: "campaign-123",
        isAuthorized: false,
        expiresAt: null,
        remainingSeconds: null,
      },
      global: {
        components: mockComponents,
      },
    });

    expect(wrapper.text()).toContain("Autoriser");
  });

  test("should emit authorize event when authorize button clicked", async () => {
    const wrapper = mount(AuthorizationCard, {
      props: {
        campaignId: "campaign-123",
        isAuthorized: false,
        expiresAt: null,
        remainingSeconds: null,
      },
      global: {
        components: mockComponents,
      },
    });

    const authorizeButton = wrapper.find("button");
    await authorizeButton.trigger("click");

    expect(wrapper.emitted("authorize")).toBeTruthy();
    expect(wrapper.emitted("authorize")?.[0]).toEqual(["campaign-123"]);
  });

  test("should show authorized state when isAuthorized is true", () => {
    const wrapper = mount(AuthorizationCard, {
      props: {
        campaignId: "campaign-123",
        isAuthorized: true,
        expiresAt: "2024-12-31T23:59:59Z",
        remainingSeconds: 3600,
      },
      global: {
        components: mockComponents,
      },
    });

    expect(wrapper.text()).toContain("Autorisé");
    expect(wrapper.text()).toContain(
      "Les sondages peuvent être lancés sur votre chaîne",
    );
  });

  test("should display countdown timer when authorized (non-owner)", () => {
    const wrapper = mount(AuthorizationCard, {
      props: {
        campaignId: "campaign-123",
        isOwner: false,
        isAuthorized: true,
        expiresAt: "2024-12-31T23:59:59Z",
        remainingSeconds: 125, // 2 minutes 5 seconds
      },
      global: {
        components: mockComponents,
      },
    });

    expect(wrapper.text()).toContain("Temps restant");
    expect(wrapper.text()).toContain("02:05");
  });

  test("should format countdown with leading zeros", () => {
    const wrapper = mount(AuthorizationCard, {
      props: {
        campaignId: "campaign-123",
        isOwner: false,
        isAuthorized: true,
        expiresAt: "2024-12-31T23:59:59Z",
        remainingSeconds: 65, // 1 minute 5 seconds
      },
      global: {
        components: mockComponents,
      },
    });

    expect(wrapper.text()).toContain("01:05");
  });

  test("should display permanent badge for owner", () => {
    const wrapper = mount(AuthorizationCard, {
      props: {
        campaignId: "campaign-123",
        isOwner: true,
        isAuthorized: true,
        expiresAt: null,
        remainingSeconds: null,
      },
      global: {
        components: mockComponents,
      },
    });

    expect(wrapper.text()).toContain("Autorisation");
    expect(wrapper.text()).toContain("Permanent");
  });

  test("should show revoke button when authorized (non-owner)", () => {
    const wrapper = mount(AuthorizationCard, {
      props: {
        campaignId: "campaign-123",
        isOwner: false,
        isAuthorized: true,
        expiresAt: "2024-12-31T23:59:59Z",
        remainingSeconds: 3600,
      },
      global: {
        components: mockComponents,
      },
    });

    expect(wrapper.text()).toContain("Révoquer");
  });

  test("should not show revoke button for owner", () => {
    const wrapper = mount(AuthorizationCard, {
      props: {
        campaignId: "campaign-123",
        isOwner: true,
        isAuthorized: true,
        expiresAt: null,
        remainingSeconds: null,
      },
      global: {
        components: mockComponents,
      },
    });

    expect(wrapper.text()).not.toContain("Révoquer");
  });

  test("should show confirm dialog when revoke button clicked", async () => {
    const wrapper = mount(AuthorizationCard, {
      props: {
        campaignId: "campaign-123",
        isOwner: false,
        isAuthorized: true,
        expiresAt: "2024-12-31T23:59:59Z",
        remainingSeconds: 3600,
      },
      global: {
        components: mockComponents,
      },
    });

    const buttons = wrapper.findAll("button");
    const revokeButton = buttons[buttons.length - 1]; // Last button is revoke

    await revokeButton.trigger("click");

    // Modal should be shown
    expect(wrapper.find(".u-modal").exists()).toBe(true);
  });

  test("should emit revoke event when confirmed", async () => {
    const wrapper = mount(AuthorizationCard, {
      props: {
        campaignId: "campaign-123",
        isOwner: false,
        isAuthorized: true,
        expiresAt: "2024-12-31T23:59:59Z",
        remainingSeconds: 3600,
      },
      global: {
        components: mockComponents,
      },
    });

    // Click revoke button to open modal
    const buttons = wrapper.findAll("button");
    const revokeButton = buttons[buttons.length - 1];
    await revokeButton.trigger("click");

    // Click confirm button in modal
    const modalButtons = wrapper.findAll(".u-modal button.u-button");
    const confirmButton = modalButtons[modalButtons.length - 1]; // Last button is confirm
    await confirmButton.trigger("click");

    expect(wrapper.emitted("revoke")).toBeTruthy();
    expect(wrapper.emitted("revoke")?.[0]).toEqual(["campaign-123"]);
  });

  test("should not emit revoke event when cancelled", async () => {
    const wrapper = mount(AuthorizationCard, {
      props: {
        campaignId: "campaign-123",
        isOwner: false,
        isAuthorized: true,
        expiresAt: "2024-12-31T23:59:59Z",
        remainingSeconds: 3600,
      },
      global: {
        components: mockComponents,
      },
    });

    // Click revoke button to open modal
    const buttons = wrapper.findAll("button");
    const revokeButton = buttons[buttons.length - 1];
    await revokeButton.trigger("click");

    // Click cancel button in modal
    const modalButtons = wrapper.findAll(".u-modal button.u-button");
    const cancelButton = modalButtons[0]; // First button is cancel
    await cancelButton.trigger("click");

    expect(wrapper.emitted("revoke")).toBeFalsy();
  });

  test("should decrement countdown every second", async () => {
    const wrapper = mount(AuthorizationCard, {
      props: {
        campaignId: "campaign-123",
        isOwner: false,
        isAuthorized: true,
        expiresAt: "2024-12-31T23:59:59Z",
        remainingSeconds: 10,
      },
      global: {
        components: mockComponents,
      },
    });

    // Initial state
    expect(wrapper.text()).toContain("00:10");

    // Advance 1 second
    await vi.advanceTimersByTimeAsync(1000);
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("00:09");

    // Advance 3 more seconds
    await vi.advanceTimersByTimeAsync(3000);
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("00:06");
  });

  test("should update countdown when remainingSeconds prop changes", async () => {
    const wrapper = mount(AuthorizationCard, {
      props: {
        campaignId: "campaign-123",
        isOwner: false,
        isAuthorized: true,
        expiresAt: "2024-12-31T23:59:59Z",
        remainingSeconds: 100,
      },
      global: {
        components: mockComponents,
      },
    });

    expect(wrapper.text()).toContain("01:40");

    // Update prop
    await wrapper.setProps({ remainingSeconds: 60 });
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("01:00");
  });

  test("should clear interval when component is unmounted", async () => {
    const wrapper = mount(AuthorizationCard, {
      props: {
        campaignId: "campaign-123",
        isOwner: false,
        isAuthorized: true,
        expiresAt: "2024-12-31T23:59:59Z",
        remainingSeconds: 3600,
      },
      global: {
        components: mockComponents,
      },
    });

    const clearIntervalSpy = vi.spyOn(global, "clearInterval");

    wrapper.unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  test("should apply yellow border when not authorized", () => {
    const wrapper = mount(AuthorizationCard, {
      props: {
        campaignId: "campaign-123",
        isAuthorized: false,
        expiresAt: null,
        remainingSeconds: null,
      },
      global: {
        components: mockComponents,
      },
    });

    const cardDiv = wrapper.find(".rounded-lg");
    expect(cardDiv.classes()).toContain("bg-warning-100");
  });

  test("should apply green border when authorized", () => {
    const wrapper = mount(AuthorizationCard, {
      props: {
        campaignId: "campaign-123",
        isAuthorized: true,
        expiresAt: "2024-12-31T23:59:59Z",
        remainingSeconds: 3600,
      },
      global: {
        components: mockComponents,
      },
    });

    const cardDiv = wrapper.findAll(".rounded-lg")[0];
    expect(cardDiv.classes()).toContain("bg-success-100");
  });

  test("should handle zero remainingSeconds", () => {
    const wrapper = mount(AuthorizationCard, {
      props: {
        campaignId: "campaign-123",
        isOwner: false,
        isAuthorized: true,
        expiresAt: "2024-12-31T23:59:59Z",
        remainingSeconds: 0,
      },
      global: {
        components: mockComponents,
      },
    });

    expect(wrapper.text()).toContain("00:00");
  });
});
