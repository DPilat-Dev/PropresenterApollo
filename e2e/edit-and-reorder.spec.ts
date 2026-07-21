import { test, expect } from '@playwright/test'
import { expectNoConsoleErrors, generateSlides, selectSlideAt, slideListItems, trackPageErrors } from './helpers'

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
})
