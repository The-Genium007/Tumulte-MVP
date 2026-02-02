import { vi } from 'vitest'
import { config } from '@vue/test-utils'
import {
  ref,
  reactive,
  computed,
  watch,
  watchEffect,
  toRef,
  toRefs,
  shallowRef,
  triggerRef,
} from 'vue'

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

// Mock Vue Composition API (auto-imported by Nuxt)
g.ref = ref
g.reactive = reactive
g.computed = computed
g.watch = watch
g.watchEffect = watchEffect
g.toRef = toRef
g.toRefs = toRefs
g.shallowRef = shallowRef
g.triggerRef = triggerRef

// Mock Nuxt auto-imports

g.useRuntimeConfig = vi.fn(() => ({
  public: {
    apiUrl: 'http://localhost:3333',
    apiBase: 'http://localhost:3333',
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

// Mock useToast (Nuxt UI composable)
g.useToast = vi.fn(() => ({
  add: vi.fn(),
  remove: vi.fn(),
  clear: vi.fn(),
}))

// Mock useTimeFormat composable (auto-imported by Nuxt)
g.useTimeFormat = vi.fn(() => ({
  formatDuration: (seconds: number): string => {
    if (seconds <= 0) return '00:00'
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  },
  formatDurationCompact: (seconds: number): string => {
    if (seconds <= 0) return '00:00'
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  },
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
