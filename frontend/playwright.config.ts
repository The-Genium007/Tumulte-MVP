import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? "github" : "html",
  // Timeout global pour chaque test (2 minutes)
  timeout: 120_000,
  // Timeout pour les expects
  expect: {
    timeout: 10_000,
  },

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    // En CI: utiliser le build de production (plus rapide, pas de PWA warnings)
    // En local: utiliser le serveur de dev pour le hot reload
    command: isCI ? "npm run build && npm run preview" : "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !isCI,
    // Timeout pour le démarrage du serveur (5 minutes max)
    timeout: 300_000,
    // Afficher les logs du serveur en cas de problème
    stdout: isCI ? "pipe" : "ignore",
    stderr: "pipe",
  },
});
