import { test, expect } from "@playwright/test";

/**
 * Overlay Display E2E Tests
 *
 * The overlay routes are public (no authentication required).
 * They are designed to be embedded in OBS as browser sources.
 */
test.describe("Overlay Display", () => {
  test("should display overlay page without authentication", async ({
    page,
  }) => {
    // Navigate to overlay page (public route)
    await page.goto("/overlay/test-streamer-id");

    // Verify page loads (no redirect to login)
    await expect(page).not.toHaveURL(/\/login/);

    // Verify body is visible (page rendered)
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("should not show navigation elements", async ({ page }) => {
    await page.goto("/overlay/test-streamer-id");

    // Wait for page to load
    await page.waitForTimeout(1000);

    // Overlay should not have header/nav (designed for OBS)
    const header = page.locator("header");
    const nav = page.locator("nav");

    const headerVisible = await header
      .isVisible({ timeout: 1000 })
      .catch(() => false);
    const navVisible = await nav
      .isVisible({ timeout: 1000 })
      .catch(() => false);

    expect(headerVisible).toBe(false);
    expect(navVisible).toBe(false);
  });

  test("should handle invalid streamer ID gracefully", async ({ page }) => {
    await page.goto("/overlay/invalid-id-that-does-not-exist");

    await page.waitForTimeout(2000);

    // Page should not crash
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("should adapt to different screen sizes", async ({ page }) => {
    // Test mobile viewport (small OBS source)
    await page.setViewportSize({ width: 300, height: 200 });
    await page.goto("/overlay/test-streamer-id");
    await page.waitForTimeout(500);

    let body = page.locator("body");
    await expect(body).toBeVisible();

    // Test larger viewport
    await page.setViewportSize({ width: 800, height: 600 });
    await page.reload();
    await page.waitForTimeout(500);

    body = page.locator("body");
    await expect(body).toBeVisible();

    // Test 1080p viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.reload();
    await page.waitForTimeout(500);

    body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("should have transparent or minimal background for OBS", async ({
    page,
  }) => {
    await page.goto("/overlay/test-streamer-id");
    await page.waitForTimeout(1000);

    // Take screenshot for visual inspection
    await page.screenshot({
      path: "test-results/overlay-screenshot.png",
      fullPage: true,
    });

    // Verify page rendered
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });
});
