import { describe, test, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { ref } from "vue";
import AppBreadcrumbs from "~/components/AppBreadcrumbs.vue";

// Mock composable
const mockBreadcrumbs = ref([]);
const mockHasBreadcrumbs = ref(false);

vi.mock("~/composables/useBreadcrumbs", () => ({
  useBreadcrumbs: () => ({
    breadcrumbs: mockBreadcrumbs,
    hasBreadcrumbs: mockHasBreadcrumbs,
  }),
}));

// Mock components
const mockComponents = {
  UIcon: {
    template: '<i class="u-icon"></i>',
    props: ["name"],
  },
  NuxtLink: {
    template: '<a :href="to"><slot /></a>',
    props: ["to"],
  },
};

describe("AppBreadcrumbs Component", () => {
  test("should not render when hasBreadcrumbs is false", () => {
    mockHasBreadcrumbs.value = false;
    mockBreadcrumbs.value = [];

    const wrapper = mount(AppBreadcrumbs, {
      global: {
        components: mockComponents,
      },
    });

    expect(wrapper.find("nav").exists()).toBe(false);
  });

  test("should render home link when hasBreadcrumbs is true", () => {
    mockHasBreadcrumbs.value = true;
    mockBreadcrumbs.value = [];

    const wrapper = mount(AppBreadcrumbs, {
      global: {
        components: mockComponents,
      },
    });

    const homeLink = wrapper.find("a[href='/']");
    expect(homeLink.exists()).toBe(true);
    expect(homeLink.attributes("aria-label")).toBe("Accueil");
  });

  test("should render clickable breadcrumb with link", () => {
    mockHasBreadcrumbs.value = true;
    mockBreadcrumbs.value = [
      { label: "Campaigns", to: "/campaigns" },
      { label: "Current Campaign" },
    ];

    const wrapper = mount(AppBreadcrumbs, {
      global: {
        components: mockComponents,
      },
    });

    const campaignsLink = wrapper.find("a[href='/campaigns']");
    expect(campaignsLink.exists()).toBe(true);
    expect(campaignsLink.text()).toContain("Campaigns");
  });

  test("should render non-clickable current breadcrumb", () => {
    mockHasBreadcrumbs.value = true;
    mockBreadcrumbs.value = [
      { label: "Campaigns", to: "/campaigns" },
      { label: "Current Campaign" },
    ];

    const wrapper = mount(AppBreadcrumbs, {
      global: {
        components: mockComponents,
      },
    });

    const currentCrumb = wrapper
      .findAll("span")
      .find((span) => span.text().includes("Current Campaign"));
    expect(currentCrumb?.exists()).toBe(true);
    expect(currentCrumb?.classes()).toContain("text-white");
  });

  test("should render chevron separators", () => {
    mockHasBreadcrumbs.value = true;
    mockBreadcrumbs.value = [
      { label: "Level 1", to: "/level1" },
      { label: "Level 2" },
    ];

    const wrapper = mount(AppBreadcrumbs, {
      global: {
        components: mockComponents,
      },
    });

    const icons = wrapper.findAll(".u-icon");
    // Should have: 1 home icon + 2 chevron icons
    expect(icons.length).toBeGreaterThanOrEqual(2);
  });

  test("should render breadcrumb with icon", () => {
    mockHasBreadcrumbs.value = true;
    mockBreadcrumbs.value = [
      {
        label: "Dashboard",
        to: "/dashboard",
        icon: "i-lucide-layout-dashboard",
      },
    ];

    const wrapper = mount(AppBreadcrumbs, {
      global: {
        components: mockComponents,
      },
    });

    expect(wrapper.text()).toContain("Dashboard");
  });

  test("should render multiple breadcrumbs", () => {
    mockHasBreadcrumbs.value = true;
    mockBreadcrumbs.value = [
      { label: "First", to: "/first" },
      { label: "Second", to: "/second" },
      { label: "Third" },
    ];

    const wrapper = mount(AppBreadcrumbs, {
      global: {
        components: mockComponents,
      },
    });

    expect(wrapper.text()).toContain("First");
    expect(wrapper.text()).toContain("Second");
    expect(wrapper.text()).toContain("Third");
  });
});
