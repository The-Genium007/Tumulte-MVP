import { test, expect } from "@playwright/test";

/**
 * Campaign Management E2E Tests
 *
 * Note: These tests require a running backend with proper authentication.
 * In CI, the backend must be available and the mock cookies won't work
 * as the backend validates sessions server-side.
 *
 * Tests are divided into:
 * - Public pages: Tests that work without authentication
 * - Authenticated pages: Tests marked as skip (require full E2E setup)
 */
test.describe("Campaign Management", () => {
  test.describe("Public pages", () => {
    test("should redirect to login when accessing campaigns without auth", async ({
      page,
    }) => {
      await page.goto("/mj");

      // Should redirect to login
      await page.waitForURL(/\/login/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/login/);
    });

    test("should redirect to login when accessing campaign details without auth", async ({
      page,
    }) => {
      await page.goto("/mj/campaigns/some-uuid-here");

      // Should redirect to login
      await page.waitForURL(/\/login/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/login/);
    });

    test("should redirect to login when accessing campaign create without auth", async ({
      page,
    }) => {
      await page.goto("/mj/campaigns/create");

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
     * 3. Test data seeded in database
     *
     * To run these tests:
     * 1. Start backend: cd backend && npm run dev
     * 2. Seed test data: node ace db:seed
     * 3. Login via Twitch OAuth to get a valid session
     * 4. Remove .skip from tests
     */

    test.skip("should display campaigns list page when authenticated", async ({
      page,
    }) => {
      // Navigate to campaigns
      await page.goto("/mj/campaigns");
      await expect(page).toHaveURL(/\/mj\/campaigns/);

      // Verify create button is present
      const createButton = page.getByRole("button", {
        name: /créer.*campagne/i,
      });
      await expect(createButton).toBeVisible();

      // Verify back button is present
      const backButton = page.getByRole("button", {
        name: /retour.*dashboard/i,
      });
      await expect(backButton).toBeVisible();
    });

    test.skip("should display empty state when no campaigns exist", async ({
      page,
    }) => {
      await page.goto("/mj/campaigns");

      // Check for empty state message
      const emptyState = page.getByText(/aucune campagne créée/i);
      await expect(emptyState).toBeVisible({ timeout: 5000 });

      // Verify "create first campaign" button
      const createFirstButton = page.getByRole("button", {
        name: /créer ma première campagne/i,
      });
      await expect(createFirstButton).toBeVisible();
    });

    test.skip("should navigate to create campaign page", async ({ page }) => {
      await page.goto("/mj/campaigns");

      // Click create button
      const createButton = page.getByRole("button", {
        name: /créer.*campagne/i,
      });
      await createButton.click();

      // Should navigate to create page
      await page.waitForURL(/\/mj\/campaigns\/create/, { timeout: 5000 });
      await expect(page).toHaveURL(/\/mj\/campaigns\/create/);
    });

    test.skip("should display campaign cards with stats", async ({ page }) => {
      await page.goto("/mj/campaigns");

      // Wait for loading to complete
      await page.waitForTimeout(2000);

      // Check if campaigns exist
      const campaignCards = page.locator(".UCard, [class*='card']");
      const cardCount = await campaignCards.count();

      if (cardCount > 0) {
        // Verify first card has expected elements
        const firstCard = campaignCards.first();

        // Campaign name should be visible
        const campaignName = firstCard.locator("h3");
        await expect(campaignName).toBeVisible();

        // Stats should be visible (members count)
        const membersActive = firstCard.getByText(/membres actifs/i);
        await expect(membersActive).toBeVisible();

        // View members button
        const viewButton = firstCard.getByRole("button", {
          name: /voir.*membres/i,
        });
        await expect(viewButton).toBeVisible();
      }
    });

    test.skip("should navigate to campaign details", async ({ page }) => {
      await page.goto("/mj/campaigns");
      await page.waitForTimeout(2000);

      // Click "Voir les membres" button on first campaign
      const viewButton = page
        .getByRole("button", { name: /voir.*membres/i })
        .first();

      if (await viewButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await viewButton.click();

        // Should navigate to campaign details
        await page.waitForURL(/\/mj\/campaigns\/[a-f0-9-]+$/, {
          timeout: 5000,
        });

        // Verify details page elements
        const backButton = page.getByRole("button", {
          name: /retour.*campagnes/i,
        });
        await expect(backButton).toBeVisible();

        // Verify stats cards are present
        const statsCards = page.getByText(/total membres|actifs|autorisés/i);
        await expect(statsCards.first()).toBeVisible();
      }
    });

    test.skip("should open invite streamer modal", async ({ page }) => {
      // Navigate directly to a campaign (requires knowing campaign ID)
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

        // Click invite button
        const inviteButton = page.getByRole("button", {
          name: /inviter.*streamer/i,
        });
        await inviteButton.click();

        // Verify modal opens
        const modal = page.locator('[role="dialog"]');
        await expect(modal).toBeVisible({ timeout: 3000 });

        // Verify modal title
        const modalTitle = page.getByRole("heading", {
          name: /inviter.*streamer/i,
        });
        await expect(modalTitle).toBeVisible();

        // Verify search input
        const searchInput = page.getByPlaceholder(/nom.*twitch/i);
        await expect(searchInput).toBeVisible();
      }
    });

    test.skip("should show delete confirmation modal", async ({ page }) => {
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

        // Click delete button
        const deleteButton = page.getByRole("button", {
          name: /supprimer/i,
        });
        await deleteButton.click();

        // Verify confirmation modal
        const modal = page.locator('[role="dialog"]');
        await expect(modal).toBeVisible({ timeout: 3000 });

        // Verify warning message
        const warningText = page.getByText(/irréversible/i);
        await expect(warningText).toBeVisible();

        // Cancel to avoid deletion
        const cancelButton = page.getByRole("button", { name: /annuler/i });
        await cancelButton.click();

        // Modal should close
        await expect(modal).not.toBeVisible({ timeout: 3000 });
      }
    });

    test.skip("should display members in campaign details", async ({
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

        // Verify members section title
        const membersTitle = page.getByRole("heading", {
          name: /membres.*campagne/i,
        });
        await expect(membersTitle).toBeVisible();

        // Either members list or empty state should be visible
        const membersList = page.locator('[class*="space-y-3"]');
        const emptyState = page.getByText(/aucun membre/i);

        const hasMembersOrEmpty =
          (await membersList.isVisible().catch(() => false)) ||
          (await emptyState.isVisible().catch(() => false));

        expect(hasMembersOrEmpty).toBeTruthy();
      }
    });
  });
});
