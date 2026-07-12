import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

const DISTINCTIVE_LINE_ONE = 'Zephyr marker verse one line one'
const DISTINCTIVE_LINE_TWO = 'Zephyr marker verse one line two'

/**
 * Attaches `pageerror` and console-error listeners to `page` and returns the
 * array they push into. Call `expectNoConsoleErrors` at the end of a test (or
 * in an `afterEach`) to assert nothing landed in it.
 *
 * Must be called before any navigation happens on the page so nothing is missed.
 */
export function trackPageErrors(page: Page): string[] {
  const errors: string[] = []

  page.on('pageerror', (err) => {
    errors.push(`pageerror: ${err.message}`)
  })

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(`console.error: ${msg.text()}`)
    }
  })

  return errors
}

export function expectNoConsoleErrors(errors: string[]): void {
  expect(errors, `Expected no page/console errors, but got:\n${errors.join('\n')}`).toEqual([])
}

/**
 * Types multi-line lyrics into the textarea, sets lines-per-slide, and clicks
 * Generate. Leaves the page with a generated song in the store.
 */
export async function generateSlides(page: Page, lyrics: string, linesPerSlide = 2): Promise<void> {
  await page.getByLabel(/paste lyrics/i).fill(lyrics)

  const linesInput = page.locator('#lines-per-slide-input')
  await linesInput.fill(String(linesPerSlide))

  await page.getByRole('button', { name: /generate slides/i }).click()
}

/** Lyrics text used by tests that need a distinctive, greppable marker. */
export const DISTINCTIVE_LYRICS = `${DISTINCTIVE_LINE_ONE}\n${DISTINCTIVE_LINE_TWO}`

/** Locator for the section listing generated slides (scoped away from the Song Manager list). */
export function slideListSection(page: Page) {
  return page.locator('section[aria-labelledby="slide-list-heading"]')
}

export function slideListItems(page: Page) {
  return slideListSection(page).locator('ul > li')
}

/**
 * Selects the slide at `index` in the slide list.
 *
 * Deliberately clicks the lyric-preview `<span>` inside the `<li>` rather
 * than the `<li>` itself: the `<li>`'s onClick does select the slide, but
 * clicking the element's bounding-box center can land on the inline
 * "Split"/"Delete" buttons or the merge checkbox depending on how the row
 * wraps (see SlideListItem.tsx), which stopPropagation() and perform a
 * different action entirely (e.g. deleting the slide) instead of selecting it.
 */
export async function selectSlideAt(page: Page, index: number): Promise<void> {
  await slideListItems(page).nth(index).locator('span').first().click()
}
