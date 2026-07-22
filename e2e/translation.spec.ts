import { test, expect } from '@playwright/test'
import { expectNoConsoleErrors, generateSlides, selectSlideAt, trackPageErrors } from './helpers'

const MOCK_TRANSLATION = 'TEXTO TRADUCIDO DE PRUEBA'

/**
 * These tests mock the real MyMemory API (https://api.mymemory.translated.net/get)
 * via page.route rather than hitting the network, for a fast/stable/CI-safe test.
 * The app's translation client (src/lib/translation/providers/myMemoryProvider.ts)
 * uses plain `fetch`, which page.route intercepts transparently.
 */
test.describe('translation', () => {
  test('translates the selected slide, and a manual override survives a subsequent "translate all"', async ({
    page,
  }) => {
    const errors = trackPageErrors(page)

    let requestCount = 0
    await page.route('https://api.mymemory.translated.net/get*', async (route) => {
      requestCount += 1
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          responseData: { translatedText: MOCK_TRANSLATION, match: 1 },
          responseStatus: 200,
        }),
      })
    })

    await page.goto('/')
    // A single-line slide: translation is now per-line, so one line == one API
    // request, which keeps the request-count assertions below exact.
    await generateSlides(page, 'Hello world line one')

    await selectSlideAt(page, 0)

    await page.locator('#translation-target-language').selectOption('es')

    await page.getByRole('button', { name: /translate this slide/i }).click()

    const translationTextarea = page.getByLabel('Translation text', { exact: true })
    await expect(translationTextarea).toHaveValue(MOCK_TRANSLATION, { timeout: 15_000 })
    expect(requestCount).toBe(1)

    const mainTextValue = await page.locator('#slide-editor-main-text').inputValue()
    const translatedValue = await translationTextarea.inputValue()
    expect(translatedValue.length).toBeGreaterThan(0)
    expect(translatedValue).not.toBe(mainTextValue)

    // Manually override the translation. Per SlideEditor.tsx, this goes through
    // setTranslationOverride, which marks the cache entry `overridden` so a
    // subsequent bulk "translate all" must not clobber it.
    const manualOverride = 'MANUALLY CORRECTED TRANSLATION TEXT'
    await translationTextarea.fill(manualOverride)
    await expect(translationTextarea).toHaveValue(manualOverride)

    await page.getByRole('button', { name: /translate all slides/i }).click()

    // There's no positive UI signal to await here (skipping an overridden
    // entry produces no visible "translating" transition for a single-slide
    // song) - this is deliberately proving a negative (no re-fetch happens),
    // so we give any potential async work a bounded settle window before
    // asserting nothing changed.
    await page.waitForTimeout(1000)

    await expect(translationTextarea).toHaveValue(manualOverride)
    expect(requestCount, 'translateAllSlides must skip the overridden entry and not re-fetch it').toBe(1)

    expectNoConsoleErrors(errors)
  })
})
