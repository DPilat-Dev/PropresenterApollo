import { test, expect } from '@playwright/test'
import {
  expectNoConsoleErrors,
  generateSlides,
  selectSlideAt,
  slideListItems,
  trackPageErrors,
  translateSelectedSlide,
} from './helpers'

test.describe('edit slide and preview wiring', () => {
  test('selecting a slide shows it in the preview, and editing main text updates both the list and preview', async ({
    page,
  }) => {
    const errors = trackPageErrors(page)
    await page.goto('/')

    await generateSlides(page, 'First slide line one\nFirst slide line two\n\nSecond slide line one\nSecond slide line two')

    const items = slideListItems(page)
    await expect(items).toHaveCount(2)

    await selectSlideAt(page, 0)
    await expect(items.nth(0)).toHaveAttribute('aria-current', 'true')

    const previewMainText = page.getByTestId('slide-preview-main-text')
    await expect(previewMainText).toContainText('First slide line one')
    await expect(previewMainText).toContainText('First slide line two')

    const mainTextArea = page.locator('#slide-editor-main-text')
    await expect(mainTextArea).toHaveValue('First slide line one\nFirst slide line two')

    const editedText = 'Edited line one\nEdited line two'
    await mainTextArea.fill(editedText)

    await expect(previewMainText).toContainText('Edited line one')
    await expect(previewMainText).toContainText('Edited line two')
    await expect(items.nth(0)).toContainText('Edited line one')
    await expect(items.nth(0)).toContainText('Edited line two')

    // Second slide's content should be untouched by the edit.
    await expect(items.nth(1)).toContainText('Second slide line one')

    expectNoConsoleErrors(errors)
  })

  test('changing the main text font size persists the new value without crashing or resetting', async ({ page }) => {
    const errors = trackPageErrors(page)
    await page.goto('/')

    await generateSlides(page, 'Only slide line one\nOnly slide line two')

    await selectSlideAt(page, 0)

    // Font size lives on the STYLE panel's "Type" tab (a slider).
    await page.getByRole('tab', { name: 'Type' }).click()

    const fontSizeInput = page.getByLabel('Main text font size')
    await expect(fontSizeInput).toHaveValue('60') // DEFAULT_MAIN_TEXT_STYLE.fontSizePt

    await fontSizeInput.fill('80')

    await expect(fontSizeInput).toHaveValue('80')

    // The page should still be fully functional after the edit (no crash / unmount).
    await expect(page.getByRole('button', { name: /export to propresenter/i })).toBeEnabled()

    expectNoConsoleErrors(errors)
  })

  test('Quick Edit applies vertical alignment to every slide at once, not just the previously selected one', async ({
    page,
  }) => {
    const errors = trackPageErrors(page)
    await page.goto('/')

    await generateSlides(page, 'First slide line one\nFirst slide line two\n\nSecond slide line one\nSecond slide line two')

    const items = slideListItems(page)
    await expect(items).toHaveCount(2)

    // Select the first slide (default per-slide alignment is "bottom") so we can
    // later prove the bulk action reaches slide 1 too, which was never selected.
    await selectSlideAt(page, 0)
    const perSlideAlignment = page.getByLabel('Main text vertical alignment', { exact: true })
    await expect(perSlideAlignment).toHaveValue('bottom')

    // Default main text box sits near the bottom of the canvas (DEFAULT_MAIN_TEXT_POSITION.y = 560).
    const perSlideY = page.getByLabel('Main text position y', { exact: true })
    await expect(perSlideY).toHaveValue('560')

    const quickEditSelect = page.getByLabel('Main text vertical alignment for all slides')
    await quickEditSelect.selectOption('center')

    await selectSlideAt(page, 0)
    await expect(perSlideAlignment).toHaveValue('center')
    // The box itself must move to vertical center of the 1080px canvas, not just the
    // text-within-box alignment - this is the exact regression this test guards against.
    await expect(perSlideY).toHaveValue('390') // (1080 - 300) / 2, with default box height 300

    await selectSlideAt(page, 1)
    await expect(perSlideAlignment).toHaveValue('center')
    await expect(perSlideY).toHaveValue('390')

    expectNoConsoleErrors(errors)
  })

  test('Quick Edit "clamp translation under main text" moves both boxes together as one stacked unit', async ({
    page,
  }) => {
    const errors = trackPageErrors(page)
    await page.goto('/')

    await generateSlides(page, 'First slide line one\nFirst slide line two\n\nSecond slide line one\nSecond slide line two')

    await selectSlideAt(page, 0)
    await translateSelectedSlide(page)

    const mainY = page.getByLabel('Main text position y', { exact: true })
    const translationY = page.getByLabel('Translation text position y', { exact: true })
    const mainHeight = Number(await page.getByLabel('Main text height', { exact: true }).inputValue())

    await page.getByLabel(/clamp translation under main text/i).check()

    // Checking the box hides the independent Translation text quick-edit row.
    await expect(page.getByLabel('Translation text vertical alignment for all slides')).not.toBeVisible()

    await page.getByLabel('Main text vertical alignment for all slides').selectOption('center')

    // combinedHeight = mainHeight(300) + CLAMP_GAP(20) + translationHeight(160) = 480
    // blockTop = (1080 - 480) / 2 = 300; mainY = 300; translationY = 300 + 300 + 20 = 620
    await expect(mainY).toHaveValue('300')
    await expect(translationY).toHaveValue('620')

    const mainYValue = Number(await mainY.inputValue())
    const translationYValue = Number(await translationY.inputValue())
    // The two boxes must not overlap: translation starts strictly after main ends.
    expect(translationYValue).toBeGreaterThan(mainYValue + mainHeight)

    expectNoConsoleErrors(errors)
  })
})
