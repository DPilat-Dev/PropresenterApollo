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
 * Creates a new song from the home/landing view (title "E2E Song" unless
 * overridden), which transitions the app into the editor shell. No-ops if
 * the editor is already showing (e.g. a song already exists).
 */
export async function startNewSongFromHome(page: Page, title = 'E2E Song'): Promise<void> {
  const newSongButton = page.getByTestId('new-song-button')
  if (!(await newSongButton.isVisible().catch(() => false))) {
    // Already past the home view (editor shell showing).
    return
  }
  await newSongButton.click()
  await page.getByTestId('new-song-title-input').fill(title)
  await page.getByRole('button', { name: /^create$/i }).click()
}

/**
 * Types multi-line lyrics into the textarea, sets lines-per-slide, and clicks
 * Generate. Leaves the page with a generated song in the store. Starts a new
 * song from the home view first if the editor isn't showing yet.
 */
export async function generateSlides(page: Page, lyrics: string, linesPerSlide = 2): Promise<void> {
  await startNewSongFromHome(page)

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

/**
 * Mocks the MyMemory translation endpoint (see translation.spec.ts) and drives the
 * Translation panel to translate the currently-selected slide, leaving it with a
 * non-null `translationText`. Must be called after a slide is selected via
 * `selectSlideAt`. Returns the mocked translated text.
 */
export async function translateSelectedSlide(page: Page, translatedText = 'TEXTO TRADUCIDO DE PRUEBA'): Promise<string> {
  await page.route('https://api.mymemory.translated.net/get*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        responseData: { translatedText, match: 1 },
        responseStatus: 200,
      }),
    })
  })

  await page.locator('#translation-target-language').selectOption('es')
  await page.getByRole('button', { name: /translate this slide/i }).click()

  const translationTextarea = page.getByLabel('Translation text', { exact: true })
  await expect(translationTextarea).toHaveValue(translatedText, { timeout: 15_000 })

  return translatedText
}
