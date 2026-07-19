import fs from 'node:fs/promises'
import { test, expect } from '@playwright/test'
import { expectNoConsoleErrors, generateSlides, slideListItems, startNewSongFromHome, trackPageErrors } from './helpers'

test.describe('export to pro6', () => {
  test('Export button is disabled for a freshly created song with no slides yet', async ({ page }) => {
    const errors = trackPageErrors(page)
    await page.goto('/')
    // No song exists yet, so the export action isn't even reachable (it lives
    // in the editor header) until a song is created from the home view.
    await expect(page.getByRole('button', { name: /export to propresenter/i })).toHaveCount(0)

    await startNewSongFromHome(page)
    await expect(page.getByRole('button', { name: /export to propresenter/i })).toBeDisabled()

    expectNoConsoleErrors(errors)
  })

  test('exporting downloads a well-formed .pro6 XML file with one RVDisplaySlide per slide', async ({ page }) => {
    const errors = trackPageErrors(page)
    await page.goto('/')

    await generateSlides(page, 'Export line one\nExport line two\n\nExport line three\nExport line four')

    const items = slideListItems(page)
    const slideCount = await items.count()
    expect(slideCount).toBeGreaterThan(0)

    const exportButton = page.getByRole('button', { name: /export to propresenter/i })
    await expect(exportButton).toBeEnabled()

    const [download] = await Promise.all([page.waitForEvent('download'), exportButton.click()])

    expect(download.suggestedFilename()).toMatch(/\.pro6$/)

    const savedPath = await download.path()
    expect(savedPath).not.toBeNull()

    const contents = await fs.readFile(savedPath as string, 'utf-8')

    expect(contents.startsWith('<?xml version="1.0" encoding="utf-8"?>')).toBe(true)

    const openingTagMatches = contents.match(/<RVDisplaySlide[\s>]/g) ?? []
    expect(openingTagMatches).toHaveLength(slideCount)

    expectNoConsoleErrors(errors)
  })
})
