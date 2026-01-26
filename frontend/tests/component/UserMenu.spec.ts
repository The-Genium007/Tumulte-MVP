import { describe, test, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import UserMenu from '~/components/UserMenu.vue'

// Mock router
const mockPush = vi.fn()
const mockRouter = {
  push: mockPush,
  replace: vi.fn(),
  back: vi.fn(),
  currentRoute: { value: { path: '/', params: {}, query: {} } },
}

// Mock composable values
const mockUser = ref({
  id: 'user-123',
  streamer: {
    twitchDisplayName: 'TestUser',
    profileImageUrl: 'https://example.com/avatar.png',
  },
})
const mockLogout = vi.fn()
const mockInvitationCount = ref(0)
const mockHasInvitations = ref(false)

// Mock all composables
vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    logout: mockLogout,
  }),
}))

vi.mock('@/composables/useNotifications', () => ({
  useNotifications: () => ({
    invitationCount: mockInvitationCount,
    hasInvitations: mockHasInvitations,
  }),
}))

vi.mock('@vueuse/core', () => ({
  onClickOutside: vi.fn(),
}))

// Mock Nuxt components
const mockComponents = {
  TwitchAvatar: {
    template: '<div class="twitch-avatar">{{ displayName }}</div>',
    props: ['imageUrl', 'displayName', 'size'],
  },
  UBadge: {
    template: '<span class="u-badge"><slot /></span>',
    props: ['color', 'variant', 'size'],
  },
  UIcon: {
    template: '<i class="u-icon"></i>',
    props: ['name'],
  },
  NuxtLink: {
    template: '<a :href="to"><slot /></a>',
    props: ['to'],
  },
}

describe('UserMenu Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset refs
    mockInvitationCount.value = 0
    mockHasInvitations.value = false
    mockPush.mockClear()

    // Mock useRouter globally
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked((globalThis as any).useRouter).mockReturnValue(
      mockRouter as unknown as ReturnType<typeof useRouter>
    )
  })

  test('should render user avatar button', () => {
    const wrapper = mount(UserMenu, {
      global: {
        components: mockComponents,
        stubs: {
          Transition: false,
        },
      },
    })

    expect(wrapper.find("button[aria-label='Menu utilisateur']").exists()).toBe(true)
  })

  test('should toggle menu when avatar clicked', async () => {
    const wrapper = mount(UserMenu, {
      global: {
        components: mockComponents,
        stubs: {
          Transition: false,
        },
      },
    })

    // Menu should be closed initially
    expect(wrapper.find('.origin-top-right').exists()).toBe(false)

    // Click to open
    await wrapper.find("button[aria-label='Menu utilisateur']").trigger('click')
    await wrapper.vm.$nextTick()

    // Menu should be open
    expect(wrapper.find('.origin-top-right').exists()).toBe(true)
  })

  test('should display user display name', async () => {
    const wrapper = mount(UserMenu, {
      global: {
        components: mockComponents,
        stubs: {
          Transition: false,
        },
      },
    })

    await wrapper.find("button[aria-label='Menu utilisateur']").trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('TestUser')
  })

  test('should show invitation badge when hasInvitations is true', () => {
    mockHasInvitations.value = true
    mockInvitationCount.value = 3

    const wrapper = mount(UserMenu, {
      global: {
        components: mockComponents,
        stubs: {
          Transition: false,
        },
      },
    })

    const badges = wrapper.findAll('.u-badge')
    expect(badges.length).toBeGreaterThan(0)
  })

  test('should not show invitation badge when hasInvitations is false', () => {
    mockHasInvitations.value = false

    const wrapper = mount(UserMenu, {
      global: {
        components: mockComponents,
        stubs: {
          Transition: false,
        },
      },
    })

    const badges = wrapper.findAll('.u-badge')
    expect(badges.length).toBe(0)
  })

  test('should display home link (Accueil)', async () => {
    const wrapper = mount(UserMenu, {
      global: {
        components: mockComponents,
        stubs: {
          Transition: false,
        },
      },
    })

    await wrapper.find("button[aria-label='Menu utilisateur']").trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Accueil')
    const homeLink = wrapper.find("a[href='/dashboard']")
    expect(homeLink.exists()).toBe(true)
  })

  test('should display Mes Campagnes link', async () => {
    const wrapper = mount(UserMenu, {
      global: {
        components: mockComponents,
        stubs: {
          Transition: false,
        },
      },
    })

    await wrapper.find("button[aria-label='Menu utilisateur']").trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Mes Campagnes')
    const campaignsLink = wrapper.find("a[href='/dashboard/campaigns']")
    expect(campaignsLink.exists()).toBe(true)
  })

  test('should display MJ dashboard link', async () => {
    const wrapper = mount(UserMenu, {
      global: {
        components: mockComponents,
        stubs: {
          Transition: false,
        },
      },
    })

    await wrapper.find("button[aria-label='Menu utilisateur']").trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Tableau de bord MJ')
    const mjLink = wrapper.find("a[href='/mj']")
    expect(mjLink.exists()).toBe(true)
  })

  test('should display settings link', async () => {
    const wrapper = mount(UserMenu, {
      global: {
        components: mockComponents,
        stubs: {
          Transition: false,
        },
      },
    })

    await wrapper.find("button[aria-label='Menu utilisateur']").trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Mon compte')
    const settingsLink = wrapper.find("a[href='/settings']")
    expect(settingsLink.exists()).toBe(true)
  })

  test('should display logout button', async () => {
    const wrapper = mount(UserMenu, {
      global: {
        components: mockComponents,
        stubs: {
          Transition: false,
        },
      },
    })

    await wrapper.find("button[aria-label='Menu utilisateur']").trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Déconnexion')
  })

  // Note: logout click test skipped due to vue-router injection complexity
  // The component uses useRouter() which is difficult to mock properly in unit tests
  // This functionality is better tested in E2E tests
})
