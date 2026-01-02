import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./tests/setup.ts"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.nuxt/**",
      "**/tests/e2e/**", // Exclude E2E tests (Playwright)
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: [
        "composables/**/*.ts",
        "stores/**/*.ts",
        "components/**/*.vue",
        "api/**/*.ts",
        "utils/**/*.ts",
      ],
      exclude: [
        "**/*.spec.ts",
        "**/*.test.ts",
        "**/tests/**",
        "**/.nuxt/**",
        "**/node_modules/**",
        "pages/**", // Pages = composition
        "layouts/**", // Layouts = composition
        "app.vue",
        "nuxt.config.ts",
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
      "~": fileURLToPath(new URL("./", import.meta.url)),
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
