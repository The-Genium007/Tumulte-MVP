import { vi } from "vitest";
import { config } from "@vue/test-utils";

// Mock Nuxt auto-imports
globalThis.useRuntimeConfig = vi.fn(() => ({
  public: {
    apiUrl: "http://localhost:3333",
    sseUrl: "http://localhost:3333",
  },
}));

globalThis.useRouter = vi.fn(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  currentRoute: { value: { path: "/", params: {}, query: {} } },
}));

globalThis.useRoute = vi.fn(() => ({
  path: "/",
  params: {},
  query: {},
}));

globalThis.navigateTo = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
globalThis.localStorage = localStorageMock as Storage;

// Configure Vue Test Utils
config.global.mocks = {
  $t: (key: string) => key, // Mock i18n si utilisé
};
