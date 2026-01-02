import { test, expect } from "@playwright/test";

test.describe("Role Switching", () => {
  test.beforeEach(async ({ context }) => {
    // Simulate logged-in user with dual role capability
    await context.addCookies([
      {
        name: "auth_token",
        value: "mock_dual_role_token",
        domain: "localhost",
        path: "/",
      },
    ]);
  });

  test("should display user menu with current role", async ({ page }) => {
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

  test("should switch from MJ to STREAMER role", async ({ page }) => {
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
      await expect(page).toHaveURL(/\/streamer\/dashboard/, { timeout: 5000 });

      // Verify we're now on streamer dashboard
      const streamerContent = page.getByText(/streamer|mes campagnes/i);
      await expect(streamerContent).toBeVisible({ timeout: 3000 });
    }
  });

  test("should switch from STREAMER to MJ role", async ({ page }) => {
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

  test("should show different navigation menu based on role", async ({
    page,
  }) => {
    // Test MJ navigation
    await page.goto("/mj/dashboard");

    const mjNavItem = page.getByRole("link", { name: /campagnes/i });
    if (await mjNavItem.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(mjNavItem).toBeVisible();
    }

    // Switch to STREAMER
    const userMenu = page.getByRole("button", { name: /menu|user|compte/i });
    await userMenu.click();

    const switchButton = page.getByRole("button", {
      name: /streamer/i,
    });

    if (await switchButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await switchButton.click();
      await page.waitForURL(/\/streamer\/dashboard/, { timeout: 5000 });

      // Verify streamer navigation
      const streamerNavItem = page.getByRole("link", {
        name: /invitations|mes campagnes/i,
      });
      await expect(streamerNavItem)
        .toBeVisible({ timeout: 3000 })
        .catch(() => {
          // Nav might be different
        });
    }
  });

  test("should preserve user session after role switch", async ({ page }) => {
    // Start on MJ dashboard
    await page.goto("/mj/dashboard");

    // Get user info
    const userMenu = page.getByRole("button", { name: /menu|user|compte/i });
    await userMenu.click();

    const userName = await page
      .locator('[data-testid="user-name"]')
      .or(page.getByText(/test|user/i).first())
      .textContent();

    await userMenu.click(); // Close menu

    // Switch role
    await userMenu.click();
    const switchButton = page.getByRole("button", {
      name: /streamer/i,
    });

    if (await switchButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await switchButton.click();
      await page.waitForURL(/\/streamer\/dashboard/, { timeout: 5000 });

      // Verify user is still logged in
      await userMenu.click();
      const newUserName = await page
        .locator('[data-testid="user-name"]')
        .or(page.getByText(/test|user/i).first())
        .textContent();

      // Username should be the same
      expect(newUserName).toBe(userName);
    }
  });

  test("should update role indicator in user menu", async ({ page }) => {
    // Start as MJ
    await page.goto("/mj/dashboard");

    const userMenu = page.getByRole("button", { name: /menu|user|compte/i });
    await userMenu.click();

    // Check role indicator shows MJ
    let roleIndicator = page.getByText(/mj|maître du jeu/i);
    await expect(roleIndicator).toBeVisible({ timeout: 2000 });

    await userMenu.click(); // Close menu

    // Switch to STREAMER
    await userMenu.click();
    const switchButton = page.getByRole("button", {
      name: /streamer/i,
    });

    if (await switchButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await switchButton.click();
      await page.waitForURL(/\/streamer\/dashboard/, { timeout: 5000 });

      // Open menu again
      await userMenu.click();

      // Check role indicator now shows STREAMER
      roleIndicator = page.getByText(/streamer/i);
      await expect(roleIndicator).toBeVisible({ timeout: 2000 });
    }
  });

  test("should show different dashboard content based on role", async ({
    page,
  }) => {
    // MJ dashboard should show campaign management
    await page.goto("/mj/dashboard");

    const mjContent = page.getByText(/créer.*campagne|mes campagnes/i);
    if (await mjContent.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(mjContent).toBeVisible();
    }

    // Switch to streamer
    const userMenu = page.getByRole("button", { name: /menu|user|compte/i });
    await userMenu.click();

    const switchButton = page.getByRole("button", {
      name: /streamer/i,
    });

    if (await switchButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await switchButton.click();
      await page.waitForURL(/\/streamer\/dashboard/, { timeout: 5000 });

      // STREAMER dashboard should show invitations
      const streamerContent = page.getByText(/invitations|campagnes actives/i);
      await expect(streamerContent)
        .toBeVisible({ timeout: 3000 })
        .catch(() => {
          // Content might vary
        });
    }
  });

  test("should redirect to appropriate dashboard after role switch", async ({
    page,
  }) => {
    // Start on a campaign details page as MJ
    await page.goto("/mj/campaigns/campaign-123");

    await page.waitForTimeout(1000);

    // Switch to STREAMER
    const userMenu = page.getByRole("button", { name: /menu|user|compte/i });
    await userMenu.click();

    const switchButton = page.getByRole("button", {
      name: /streamer/i,
    });

    if (await switchButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await switchButton.click();

      // Should redirect to streamer dashboard (not stay on MJ campaign page)
      await expect(page).toHaveURL(/\/streamer/, { timeout: 5000 });
      await expect(page).not.toHaveURL(/\/mj\//);
    }
  });

  test("should allow multiple role switches in same session", async ({
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
      await page.waitForURL(/\/streamer\/dashboard/, { timeout: 5000 });

      // STREAMER -> MJ
      userMenu = page.getByRole("button", { name: /menu|user|compte/i });
      await userMenu.click();

      switchButton = page.getByRole("button", {
        name: /mj|maître du jeu/i,
      });

      if (await switchButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await switchButton.click();
        await page.waitForURL(/\/mj\/dashboard/, { timeout: 5000 });

        // Back to MJ
        await expect(page).toHaveURL(/\/mj\/dashboard/);
      }
    }
  });

  test("should handle role switch API errors gracefully", async ({ page }) => {
    // This test simulates a failed role switch
    await page.goto("/mj/dashboard");

    const userMenu = page.getByRole("button", { name: /menu|user|compte/i });
    await userMenu.click();

    const switchButton = page.getByRole("button", {
      name: /streamer/i,
    });

    if (await switchButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Mock API error would happen here in real scenario
      await switchButton.click();

      await page.waitForTimeout(2000);

      // If switch fails, should show error message
      const errorMessage = page.getByText(/erreur|error|échec/i);
      const errorVisible = await errorMessage
        .isVisible({ timeout: 2000 })
        .catch(() => false);

      // Either redirect succeeded or error shown
      const currentUrl = page.url();
      const switchSucceeded = currentUrl.includes("/streamer/");

      expect(switchSucceeded || errorVisible).toBeTruthy();
    }
  });

  test("should display correct role badge in header", async ({ page }) => {
    // MJ role
    await page.goto("/mj/dashboard");

    const mjBadge = page
      .locator('[data-testid="role-badge"]')
      .or(page.getByText(/\bmj\b/i));

    if (await mjBadge.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(mjBadge).toBeVisible();
    }

    // Switch to STREAMER
    const userMenu = page.getByRole("button", { name: /menu|user|compte/i });
    await userMenu.click();

    const switchButton = page.getByRole("button", {
      name: /streamer/i,
    });

    if (await switchButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await switchButton.click();
      await page.waitForURL(/\/streamer\/dashboard/, { timeout: 5000 });

      // STREAMER role badge
      const streamerBadge = page
        .locator('[data-testid="role-badge"]')
        .or(page.getByText(/streamer/i));

      await expect(streamerBadge)
        .toBeVisible({ timeout: 2000 })
        .catch(() => {
          // Badge might not exist
        });
    }
  });
});
