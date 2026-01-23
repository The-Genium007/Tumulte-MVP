import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('should redirect to login page when not authenticated', async ({ page }) => {
    await page.goto('/')

    // Wait for redirect to login page
    await page.waitForURL(/\/login/, { timeout: 10000 })

    // Verify we're on the login page
    await expect(page).toHaveURL(/\/login/)
  })

  test('should display login page with Twitch button', async ({ page }) => {
    await page.goto('/login')

    // Verify login button is present
    const loginButton = page.getByRole('button', {
      name: /connecter.*twitch|twitch/i,
    })
    await expect(loginButton).toBeVisible()

    // Verify page title
    const heading = page.getByRole('heading', {
      name: /tumulte/i,
    })
    await expect(heading).toBeVisible()
  })

  test.skip('should redirect to Twitch OAuth on login click (requires backend)', async ({
    page,
  }) => {
    await page.goto('/login')

    // Click login button
    const loginButton = page.getByRole('button', {
      name: /connecter.*twitch|twitch/i,
    })

    // Start waiting for navigation before clicking
    const navigationPromise = page.waitForURL(/twitch\.tv|localhost:3333/, {
      timeout: 10000,
    })
    await loginButton.click()
    await navigationPromise

    // Verify we're being redirected (either to Twitch or backend auth endpoint)
    const url = page.url()
    expect(url).toMatch(/twitch\.tv|localhost:3333\/auth/)
  })

  test('should protect MJ routes when not authenticated', async ({ page }) => {
    // Try to access protected route without authentication
    await page.goto('/mj')

    // Should redirect to login
    await page.waitForURL(/\/login/, { timeout: 10000 })

    await expect(page).toHaveURL(/\/login/)
  })

  test('should protect streamer routes when not authenticated', async ({ page }) => {
    // Try to access protected route without authentication
    await page.goto('/dashboard')

    // Should redirect to login
    await page.waitForURL(/\/login/, { timeout: 10000 })

    await expect(page).toHaveURL(/\/login/)
  })

  test('should display error message for invalid OAuth state', async ({ page }) => {
    await page.goto('/login?error=invalid_state')

    // Verify error message is displayed
    const errorAlert = page.getByText(/erreur.*csrf|validation/i)
    await expect(errorAlert).toBeVisible({ timeout: 3000 })
  })

  test('should display error message for OAuth failure', async ({ page }) => {
    await page.goto('/login?error=oauth_failed')

    // Verify error message is displayed
    const errorAlert = page.getByText(/échec.*authentification|oauth/i)
    await expect(errorAlert).toBeVisible({ timeout: 3000 })
  })

  test('should display error message for session failure', async ({ page }) => {
    await page.goto('/login?error=session_failed')

    // Verify error message is displayed
    const errorAlert = page.getByText(/erreur.*session/i)
    await expect(errorAlert).toBeVisible({ timeout: 3000 })
  })
})
