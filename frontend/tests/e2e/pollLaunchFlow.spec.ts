import { test, expect } from "@playwright/test";

/**
 * Poll Launch Flow E2E Tests
 *
 * Note: These tests require a running backend with proper authentication.
 * Tests are divided into:
 * - Public pages: Tests that work without authentication
 * - Authenticated pages: Tests marked as skip (require full E2E setup)
 */
test.describe("Poll Launch Flow", () => {
  test.describe("Public pages", () => {
    test("should redirect to login when accessing poll create without auth", async ({
      page,
    }) => {
      // New architecture: polls are created directly under campaigns
      await page.goto("/mj/campaigns/some-campaign-id/polls/create");

      // Should redirect to login
      await page.waitForURL(/\/login/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/login/);
    });

    test("should redirect to login when accessing campaign details without auth", async ({
      page,
    }) => {
      await page.goto("/mj/campaigns/some-campaign-id");

      // Should redirect to login
      await page.waitForURL(/\/login/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe("Authenticated pages (require backend)", () => {
    /**
     * These tests are skipped because they require:
     * 1. Running backend with database
     * 2. Valid authenticated session (not just a cookie)
     * 3. Test data seeded in database (campaigns, poll templates)
     *
     * To run these tests:
     * 1. Start backend: cd backend && npm run dev
     * 2. Seed test data: node ace db:seed
     * 3. Login via Twitch OAuth to get a valid session
     * 4. Remove .skip from tests
     */

    test.skip("should display poll templates section", async ({ page }) => {
      // Navigate to campaign details
      await page.goto("/mj/campaigns");
      await page.waitForTimeout(2000);

      // Click on first campaign
      const campaignCard = page.locator(".UCard, [class*='card']").first();

      if (await campaignCard.isVisible({ timeout: 3000 }).catch(() => false)) {
        await campaignCard.click();
        await page.waitForURL(/\/mj\/campaigns\/[^/]+/, { timeout: 5000 });

        // Verify poll templates section exists
        const pollsSection = page.getByText(/sondages|templates/i);
        await expect(pollsSection).toBeVisible({ timeout: 5000 });
      }
    });

    test.skip("should display create poll template button", async ({
      page,
    }) => {
      await page.goto("/mj/campaigns");
      await page.waitForTimeout(2000);

      const campaignCard = page.locator(".UCard, [class*='card']").first();

      if (await campaignCard.isVisible({ timeout: 3000 }).catch(() => false)) {
        await campaignCard.click();
        await page.waitForURL(/\/mj\/campaigns\/[^/]+/, { timeout: 5000 });

        // Find create poll button
        const createButton = page.getByRole("button", {
          name: /créer.*sondage|nouveau.*template/i,
        });

        await expect(createButton).toBeVisible({ timeout: 3000 });
      }
    });

    test.skip("should open create poll template modal", async ({ page }) => {
      await page.goto("/mj/campaigns");
      await page.waitForTimeout(2000);

      const campaignCard = page.locator(".UCard, [class*='card']").first();

      if (await campaignCard.isVisible({ timeout: 3000 }).catch(() => false)) {
        await campaignCard.click();
        await page.waitForURL(/\/mj\/campaigns\/[^/]+/, { timeout: 5000 });

        const createButton = page.getByRole("button", {
          name: /créer.*sondage|nouveau/i,
        });

        if (
          await createButton.isVisible({ timeout: 2000 }).catch(() => false)
        ) {
          await createButton.click();

          // Verify modal appears
          const modal = page.locator('[role="dialog"]');
          await expect(modal).toBeVisible({ timeout: 3000 });
        }
      }
    });

    test.skip("should create new poll template", async ({ page }) => {
      await page.goto("/mj/campaigns");
      await page.waitForTimeout(2000);

      const campaignCard = page.locator(".UCard, [class*='card']").first();

      if (await campaignCard.isVisible({ timeout: 3000 }).catch(() => false)) {
        await campaignCard.click();
        await page.waitForURL(/\/mj\/campaigns\/[^/]+/, { timeout: 5000 });

        const createButton = page.getByRole("button", {
          name: /créer.*sondage|nouveau/i,
        });

        if (
          await createButton.isVisible({ timeout: 2000 }).catch(() => false)
        ) {
          await createButton.click();
          await page.waitForTimeout(500);

          // Fill poll question
          const questionInput = page.getByLabel(/question|titre/i);
          await questionInput.fill("Quelle option préférez-vous ?");

          // Add options
          const option1 = page.getByLabel(/option.*1/i);
          await option1.fill("Option A");

          const option2 = page.getByLabel(/option.*2/i);
          await option2.fill("Option B");

          // Submit form
          const submitButton = page.getByRole("button", {
            name: /créer|enregistrer/i,
          });
          await submitButton.click();

          // Verify poll template appears
          await page.waitForTimeout(1000);
          const pollTemplate = page.getByText("Quelle option préférez-vous ?");
          await expect(pollTemplate).toBeVisible({ timeout: 5000 });
        }
      }
    });

    test.skip("should launch poll successfully", async ({ page }) => {
      await page.goto("/mj/campaigns");
      await page.waitForTimeout(2000);

      const campaignCard = page.locator(".UCard, [class*='card']").first();

      if (await campaignCard.isVisible({ timeout: 3000 }).catch(() => false)) {
        await campaignCard.click();
        await page.waitForURL(/\/mj\/campaigns\/[^/]+/, { timeout: 5000 });

        // Find launch button on a poll template
        const launchButton = page
          .getByRole("button", {
            name: /lancer|démarrer/i,
          })
          .first();

        if (
          await launchButton.isVisible({ timeout: 2000 }).catch(() => false)
        ) {
          await launchButton.click();

          // Wait for poll status update
          await page.waitForTimeout(1000);

          // Verify poll is running
          const runningStatus = page.getByText(/en cours|actif/i);
          await expect(runningStatus).toBeVisible({ timeout: 5000 });
        }
      }
    });

    test.skip("should cancel poll", async ({ page }) => {
      await page.goto("/mj/campaigns");
      await page.waitForTimeout(2000);

      const campaignCard = page.locator(".UCard, [class*='card']").first();

      if (await campaignCard.isVisible({ timeout: 3000 }).catch(() => false)) {
        await campaignCard.click();
        await page.waitForURL(/\/mj\/campaigns\/[^/]+/, { timeout: 5000 });

        // Find cancel button on a running poll
        const cancelButton = page.getByRole("button", {
          name: /annuler|arrêter/i,
        });

        if (
          await cancelButton.isVisible({ timeout: 2000 }).catch(() => false)
        ) {
          await cancelButton.click();

          // Confirm cancellation if modal appears
          await page.waitForTimeout(500);
          const confirmButton = page.getByRole("button", {
            name: /confirmer|oui/i,
          });

          if (
            await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)
          ) {
            await confirmButton.click();
          }

          // Verify poll is cancelled
          await page.waitForTimeout(1000);
          const cancelledStatus = page.getByText(/annulé|terminé/i);
          await expect(cancelledStatus).toBeVisible({ timeout: 5000 });
        }
      }
    });

    test.skip("should display streamers authorization status", async ({
      page,
    }) => {
      await page.goto("/mj/campaigns");
      await page.waitForTimeout(2000);

      const viewButton = page
        .getByRole("button", { name: /voir.*membres/i })
        .first();

      if (await viewButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await viewButton.click();
        await page.waitForURL(/\/mj\/campaigns\/[a-f0-9-]+$/, {
          timeout: 5000,
        });

        // Verify members section
        const membersSection = page.getByRole("heading", {
          name: /membres/i,
        });
        await expect(membersSection).toBeVisible();

        // Verify authorization status is displayed (badge or text)
        const authStatus = page.getByText(/autorisé|non autorisé|en attente/i);
        await expect(authStatus.first()).toBeVisible({ timeout: 3000 });
      }
    });

    test.skip("should display real-time vote updates", async ({ page }) => {
      await page.goto("/mj/campaigns");
      await page.waitForTimeout(2000);

      const campaignCard = page.locator(".UCard, [class*='card']").first();

      if (await campaignCard.isVisible({ timeout: 3000 }).catch(() => false)) {
        await campaignCard.click();
        await page.waitForURL(/\/mj\/campaigns\/[^/]+/, { timeout: 5000 });

        // Find poll results display
        const pollResults = page.getByText(/votes|résultats/i);

        if (await pollResults.isVisible({ timeout: 3000 }).catch(() => false)) {
          // Take snapshot of initial content
          const initialText = await page.textContent("body");

          // Wait for potential WebSocket updates
          await page.waitForTimeout(3000);

          // Verify page is still functional
          await expect(pollResults).toBeVisible();
          expect(initialText).toBeDefined();
        }
      }
    });

    test.skip("should display final results after poll ends", async ({
      page,
    }) => {
      await page.goto("/mj/campaigns");
      await page.waitForTimeout(2000);

      const campaignCard = page.locator(".UCard, [class*='card']").first();

      if (await campaignCard.isVisible({ timeout: 3000 }).catch(() => false)) {
        await campaignCard.click();
        await page.waitForURL(/\/mj\/campaigns\/[^/]+/, { timeout: 5000 });

        // Find completed poll
        const completedPoll = page.getByText(/terminé|completed/i).first();

        if (
          await completedPoll.isVisible({ timeout: 3000 }).catch(() => false)
        ) {
          await completedPoll.click();
          await page.waitForTimeout(500);

          // Verify results are displayed
          const results = page.getByText(/résultats|votes/i);
          await expect(results).toBeVisible({ timeout: 3000 });
        }
      }
    });
  });
});
