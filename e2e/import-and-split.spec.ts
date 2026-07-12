import { test, expect } from '@playwright/test'
import { expectNoConsoleErrors, slideListItems, trackPageErrors } from './helpers'

test.describe('import and split', () => {
  test('splits pasted multi-verse lyrics into slides, skipping the blank line, at the configured lines-per-slide', async ({
    page,
  }) => {
    const errors = trackPageErrors(page)
    await page.goto('/')

    const lyrics = ['Verse one line one', 'Verse one line two', '', 'Verse two line one', 'Verse two line two'].join(
      '\n',
    )

    await page.getByLabel(/paste lyrics/i).fill(lyrics)

    const linesPerSlideInput = page.locator('#lines-per-slide-input')
    await linesPerSlideInput.fill('2')

    await page.getByRole('button', { name: /generate slides/i }).click()

    const items = slideListItems(page)
    await expect(items).toHaveCount(2)

    // The blank line must not have produced a slide of its own, and each
    // slide's visible text should contain both of its source lines.
    await expect(items.nth(0)).toContainText('Verse one line one')
    await expect(items.nth(0)).toContainText('Verse one line two')
    await expect(items.nth(1)).toContainText('Verse two line one')
    await expect(items.nth(1)).toContainText('Verse two line two')

    expectNoConsoleErrors(errors)
  })
})
