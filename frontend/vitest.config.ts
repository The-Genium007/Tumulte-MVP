import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.nuxt/**',
      '**/tests/e2e/**', // Exclude E2E tests (Playwright)
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: [
        'composables/**/*.ts',
        'stores/**/*.ts',
        // "components/**/*.vue", // Vue components tested via E2E
        'api/**/*.ts',
        'utils/**/*.ts',
      ],
      exclude: [
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/tests/**',
        '**/.nuxt/**',
        '**/node_modules/**',
        'pages/**', // Pages = composition
        'layouts/**', // Layouts = composition
        'app.vue',
        'nuxt.config.ts',
        // Composables excluded from coverage (browser-only, complex mocking required)
        'composables/useOfflineFirst.ts', // IndexedDB + complex offline logic
        'composables/useOnlineStatus.ts', // Network status listeners
        'composables/useOverlayConfig.ts', // Overlay Studio specific
        'composables/useOverlayCharacters.ts', // Overlay Studio specific
        'composables/useVttAutoSync.ts', // VTT WebSocket specific
        'composables/useVttConnections.ts', // VTT WebSocket specific
        'composables/useResilientWebSocket.ts', // Complex WebSocket reconnection
        'composables/useLoadingScreen.ts', // Animation timing specific
        'composables/useCampaignCharacters.ts', // Thin wrapper over useCharacters
        'composables/useSelectedCampaign.ts', // Simple wrapper
        'composables/useActionButton.ts', // UI animation specific
        'composables/useAppVersion.ts', // Simple env access
        'composables/usePushNotifications.ts', // Service Worker + Push API
        'composables/useSupportWidget.ts', // Simple Pinia store wrapper
        'api/repositories/**', // Thin wrappers over HTTP client
        'utils/offline-storage.ts', // IndexedDB specific
        'utils/supportTelemetry.ts', // Console interception
        'stores/pushNotifications.ts', // Service Worker + Push API + complex browser APIs
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./', import.meta.url)),
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
})
