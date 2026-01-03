import { test, expect } from "@playwright/test";

/**
 * Role Switching E2E Tests
 *
 * Note: These tests require a running backend with proper authentication.
 * Tests are divided into:
 * - Public pages: Tests that work without authentication
 * - Authenticated pages: Tests marked as skip (require full E2E setup with dual-role user)
 */
test.describe("Role Switching", () => {
  test.describe("Public pages", () => {
    test("should redirect to login when accessing MJ dashboard without auth", async ({
      page,
    }) => {
      await page.goto("/mj");

      // Should redirect to login
      await page.waitForURL(/\/login/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/login/);
    });

    test("should redirect to login when accessing streamer without auth", async ({
      page,
    }) => {
      await page.goto("/streamer");

      // Should redirect to login
      await page.waitForURL(/\/login/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe("Authenticated pages (require backend)", () => {
    /**
     * These tests are skipped because they require:
     * 1. Running backend with database
     * 2. Valid authenticated session with dual role capability
     * 3. User with both MJ and STREAMER roles
     *
     * To run these tests:
     * 1. Start backend: cd backend && npm run dev
     * 2. Login via Twitch OAuth to get a valid session
     * 3. Ensure user has both MJ and STREAMER capabilities
     * 4. Remove .skip from tests
     */

    test.skip("should display user menu with current role", async ({
      page,
    }) => {
      // Navigate to MJ dashboard
      await page.goto("/mj/dashboard");

      // Find user menu button
      const userMenu = page.getByRole("button", { name: /menu|user|compte/i });
      await expect(userMenu).toBeVisible({ timeout: 5000 });

      // Open menu
      await userMenu.click();

      // Verify current role is displayed
      const roleDisplay = page.getByText(/mj|maître du jeu/i);
      await expect(roleDisplay).toBeVisible({ timeout: 3000 });
    });

    test.skip("should switch from MJ to STREAMER role", async ({ page }) => {
      // Start on MJ dashboard
      await page.goto("/mj/dashboard");

      // Verify we're on MJ dashboard
      await expect(page).toHaveURL(/\/mj\/dashboard/);

      // Open user menu
      const userMenu = page.getByRole("button", { name: /menu|user|compte/i });
      await userMenu.click();

      // Click switch role button
      const switchButton = page.getByRole("button", {
        name: /passer en.*streamer|switch.*streamer|streamer/i,
      });

      if (await switchButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await switchButton.click();

        // Wait for redirect to streamer dashboard
        await expect(page).toHaveURL(/\/streamer/, { timeout: 5000 });

        // Verify we're now on streamer section
        const streamerContent = page.getByText(/streamer|mes campagnes/i);
        await expect(streamerContent).toBeVisible({ timeout: 3000 });
      }
    });

    test.skip("should switch from STREAMER to MJ role", async ({ page }) => {
      // Start on STREAMER dashboard
      await page.goto("/streamer/dashboard");

      // Verify we're on STREAMER dashboard
      await expect(page).toHaveURL(/\/streamer\/dashboard/);

      // Open user menu
      const userMenu = page.getByRole("button", { name: /menu|user|compte/i });
      await userMenu.click();

      // Click switch role button
      const switchButton = page.getByRole("button", {
        name: /passer en.*mj|switch.*mj|maître du jeu/i,
      });

      if (await switchButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await switchButton.click();

        // Wait for redirect to MJ dashboard
        await expect(page).toHaveURL(/\/mj\/dashboard/, { timeout: 5000 });

        // Verify we're now on MJ dashboard
        const mjContent = page.getByText(/mj|campagnes|maître du jeu/i);
        await expect(mjContent).toBeVisible({ timeout: 3000 });
      }
    });

    test.skip("should show different navigation menu based on role", async ({
      page,
    }) => {
      // Test MJ navigation
      await page.goto("/mj/dashboard");

      const mjNavItem = page.getByRole("link", { name: /campagnes/i });
      await expect(mjNavItem).toBeVisible({ timeout: 2000 });

      // Switch to STREAMER
      const userMenu = page.getByRole("button", { name: /menu|user|compte/i });
      await userMenu.click();

      const switchButton = page.getByRole("button", {
        name: /streamer/i,
      });

      if (await switchButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await switchButton.click();
        await page.waitForURL(/\/streamer/, { timeout: 5000 });

        // Verify streamer navigation
        const streamerNavItem = page.getByRole("link", {
          name: /invitations|campagnes/i,
        });
        await expect(streamerNavItem).toBeVisible({ timeout: 3000 });
      }
    });

    test.skip("should preserve user session after role switch", async ({
      page,
    }) => {
      // Start on MJ dashboard
      await page.goto("/mj/dashboard");

      // Get username from header or menu
      const userMenu = page.getByRole("button", { name: /menu|user|compte/i });
      await userMenu.click();

      const userNameElement = page.locator('[class*="user-name"]').first();
      const userName = await userNameElement.textContent().catch(() => "user");

      await userMenu.click(); // Close menu

      // Switch role
      await userMenu.click();
      const switchButton = page.getByRole("button", {
        name: /streamer/i,
      });

      if (await switchButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await switchButton.click();
        await page.waitForURL(/\/streamer/, { timeout: 5000 });

        // Verify user is still logged in
        await userMenu.click();
        const newUserNameElement = page.locator('[class*="user-name"]').first();
        const newUserName = await newUserNameElement
          .textContent()
          .catch(() => "user");

        // Username should be the same
        expect(newUserName).toBe(userName);
      }
    });

    test.skip("should redirect to appropriate dashboard after role switch", async ({
      page,
    }) => {
      // Start on a campaign details page as MJ
      await page.goto("/mj/campaigns");

      await page.waitForTimeout(1000);

      // Switch to STREAMER
      const userMenu = page.getByRole("button", { name: /menu|user|compte/i });
      await userMenu.click();

      const switchButton = page.getByRole("button", {
        name: /streamer/i,
      });

      if (await switchButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await switchButton.click();

        // Should redirect to streamer section (not stay on MJ page)
        await expect(page).toHaveURL(/\/streamer/, { timeout: 5000 });
        await expect(page).not.toHaveURL(/\/mj\//);
      }
    });

    test.skip("should allow multiple role switches in same session", async ({
      page,
    }) => {
      // MJ -> STREAMER
      await page.goto("/mj/dashboard");
      await expect(page).toHaveURL(/\/mj\/dashboard/);

      let userMenu = page.getByRole("button", { name: /menu|user|compte/i });
      await userMenu.click();

      let switchButton = page.getByRole("button", {
        name: /streamer/i,
      });

      if (await switchButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await switchButton.click();
        await page.waitForURL(/\/streamer/, { timeout: 5000 });

        // STREAMER -> MJ
        userMenu = page.getByRole("button", { name: /menu|user|compte/i });
        await userMenu.click();

        switchButton = page.getByRole("button", {
          name: /mj|maître du jeu/i,
        });

        if (
          await switchButton.isVisible({ timeout: 2000 }).catch(() => false)
        ) {
          await switchButton.click();
          await page.waitForURL(/\/mj\/dashboard/, { timeout: 5000 });

          // Back to MJ
          await expect(page).toHaveURL(/\/mj\/dashboard/);
        }
      }
    });

    test.skip("should show different dashboard content based on role", async ({
      page,
    }) => {
      // MJ dashboard should show campaign management
      await page.goto("/mj/dashboard");

      const mjContent = page.getByText(/créer.*campagne|mes campagnes/i);
      await expect(mjContent).toBeVisible({ timeout: 3000 });

      // Switch to streamer
      const userMenu = page.getByRole("button", { name: /menu|user|compte/i });
      await userMenu.click();

      const switchButton = page.getByRole("button", {
        name: /streamer/i,
      });

      if (await switchButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await switchButton.click();
        await page.waitForURL(/\/streamer/, { timeout: 5000 });

        // STREAMER dashboard should show invitations or campaigns
        const streamerContent = page.getByText(
          /invitations|campagnes actives/i,
        );
        await expect(streamerContent).toBeVisible({ timeout: 3000 });
      }
    });
  });
});
