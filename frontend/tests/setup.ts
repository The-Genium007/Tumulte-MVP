import { vi } from 'vitest'
import { config } from '@vue/test-utils'

// Type-safe globalThis for tests
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g = globalThis as any

// Export typed mock for use in tests
export const mockGlobals = {
  useRuntimeConfig: g.useRuntimeConfig as ReturnType<typeof vi.fn>,
  useRouter: g.useRouter as ReturnType<typeof vi.fn>,
  useRoute: g.useRoute as ReturnType<typeof vi.fn>,
  navigateTo: g.navigateTo as ReturnType<typeof vi.fn>,
}

// Mock Nuxt auto-imports

g.useRuntimeConfig = vi.fn(() => ({
  public: {
    apiUrl: 'http://localhost:3333',
    sseUrl: 'http://localhost:3333',
  },
}))

g.useRouter = vi.fn(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  currentRoute: { value: { path: '/', params: {}, query: {} } },
}))

g.useRoute = vi.fn(() => ({
  path: '/',
  params: {},
  query: {},
}))

g.navigateTo = vi.fn()

g.useNuxtApp = vi.fn(() => ({
  $posthog: undefined,
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
}
g.localStorage = localStorageMock as Storage

// Configure Vue Test Utils
config.global.mocks = {
  $t: (key: string) => key, // Mock i18n si utilisé
}
