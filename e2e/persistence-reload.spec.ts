import { test, expect } from '@playwright/test'
import { DISTINCTIVE_LYRICS, expectNoConsoleErrors, generateSlides, slideListItems, trackPageErrors } from './helpers'

test.describe('persistence across reload', () => {
  test('autosaves the song, then a reloaded page can reload it via the Song Manager', async ({ page }) => {
    const errors = trackPageErrors(page)
    await page.goto('/')

    await generateSlides(page, DISTINCTIVE_LYRICS)

    // Wait for the debounced autosave (default ~1500ms) to actually persist,
    // rather than sleeping a fixed duration.
    await expect(page.getByTestId('autosave-status')).toHaveText('Saved', { timeout: 10_000 })

    await page.reload()

    // App.tsx / songSlice.ts do not auto-restore the most recent song on
    // startup - `song` starts as `null` again after a reload, so the app
    // shows the home/landing view again. The user must explicitly load the
    // song from the Song Manager's "Your Songs" list there (which refreshes
    // itself from IndexedDB on mount) to get back into the editor.
    await expect(page.getByRole('heading', { name: /your songs/i })).toBeVisible()

    const loadButton = page.locator('[data-testid^="load-song-"]').first()
    await expect(loadButton).toBeVisible({ timeout: 10_000 })
    await loadButton.click()

    const items = slideListItems(page)
    await expect(items).toHaveCount(1)
    await expect(items.first()).toContainText('Zephyr marker verse one line one')
    await expect(items.first()).toContainText('Zephyr marker verse one line two')

    expectNoConsoleErrors(errors)
  })

  test('a fresh browser context loads to the home/landing view with no console errors', async ({ page }) => {
    const errors = trackPageErrors(page)

    // Every Playwright test already runs in its own isolated context (fresh
    // storage) by default, so no explicit context/storage reset is needed here.
    await page.goto('/')

    await expect(page.getByRole('heading', { name: /worship slides/i })).toBeVisible()
    await expect(page.getByRole('navigation', { name: /primary/i })).toBeVisible()
    await expect(page.getByText('No saved songs yet.')).toBeVisible()
    // The editor shell (only reachable once a song exists) must not be shown yet.
    await expect(page.getByLabel(/paste lyrics/i)).toHaveCount(0)

    expectNoConsoleErrors(errors)
  })
})
