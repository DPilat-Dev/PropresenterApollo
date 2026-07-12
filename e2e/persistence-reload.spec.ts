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
    // startup - `song` starts as `null` again after a reload. The user must
    // explicitly load it from the Song Manager's "Saved Songs" list, which
    // refreshes itself from IndexedDB on mount.
    await expect(page.locator('section[aria-labelledby="slide-list-heading"]')).toContainText(
      'Paste lyrics above to get started.',
    )

    const loadButton = page.locator('[data-testid^="load-song-"]').first()
    await expect(loadButton).toBeVisible({ timeout: 10_000 })
    await loadButton.click()

    const items = slideListItems(page)
    await expect(items).toHaveCount(1)
    await expect(items.first()).toContainText('Zephyr marker verse one line one')
    await expect(items.first()).toContainText('Zephyr marker verse one line two')

    expectNoConsoleErrors(errors)
  })

  test('a fresh browser context loads to a clean empty state with no console errors', async ({ page }) => {
    const errors = trackPageErrors(page)

    // Every Playwright test already runs in its own isolated context (fresh
    // storage) by default, so no explicit context/storage reset is needed here.
    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'Lyrics → ProPresenter 6' })).toBeVisible()
    await expect(page.locator('section[aria-labelledby="slide-list-heading"]')).toContainText(
      'Paste lyrics above to get started.',
    )
    await expect(page.getByRole('button', { name: /export to propresenter/i })).toBeDisabled()
    await expect(page.getByText('No saved songs yet.')).toBeVisible()

    expectNoConsoleErrors(errors)
  })
})
