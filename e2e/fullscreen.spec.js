import { test, expect } from '@playwright/test'

// The Big screen button hides the browser's bars, and the home-screen manifest is in place.
test('the game can fill the screen', async ({ page }) => {
  await page.goto('/')
  const big = page.getByRole('button', { name: 'Big screen' })
  await big.click()
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true)
  // Still full screen inside a chapter.
  await page.getByRole('link', { name: /4 spellings of \/ae\// }).click()
  await expect(page.getByRole('button', { name: 'Start!' })).toBeVisible()
  expect(await page.evaluate(() => !!document.fullscreenElement)).toBe(true)
  await page.goBack()
  await page.getByRole('button', { name: 'Small screen' }).click()
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false)
  await expect(big).toBeVisible()
})

// Browsers only allow full screen after a tap, so once Big screen has been chosen on a device,
// the game goes full screen again on the first tap anywhere.
test('after Big screen, the first tap goes full screen again', async ({ page }) => {
  const full = () => page.evaluate(() => !!document.fullscreenElement)
  await page.goto('/')
  await page.getByRole('button', { name: 'Big screen' }).click()
  await expect.poll(full).toBe(true)

  // Opened again later: not full screen until she taps something.
  await page.reload()
  expect(await full()).toBe(false)
  await page.getByRole('heading', { name: 'Pick a chapter' }).click()
  await expect.poll(full).toBe(true)

  // The Back gesture leaves full screen; the next tap comes back to it.
  await page.evaluate(() => document.exitFullscreen())
  await expect.poll(full).toBe(false)
  await page.getByRole('heading', { name: 'Pick a chapter' }).click()
  await expect.poll(full).toBe(true)

  // Small screen turns it off for this device.
  await page.getByRole('button', { name: 'Small screen' }).click()
  await expect.poll(full).toBe(false)
  await page.reload()
  await page.getByRole('heading', { name: 'Pick a chapter' }).click()
  await page.waitForTimeout(300)
  expect(await full()).toBe(false)
})

test('Add to Home Screen opens full screen', async ({ page, request }) => {
  await page.goto('/')
  const link = page.locator('link[rel="manifest"]')
  await expect(link).toHaveAttribute('crossorigin', 'use-credentials')
  const manifest = await (await request.get(await link.getAttribute('href'))).json()
  expect(manifest.display).toBe('fullscreen')
  for (const icon of manifest.icons) {
    const res = await request.get(icon.src)
    expect(res.ok(), icon.src).toBe(true)
    expect(res.headers()['content-type']).toContain('image/png')
  }
})

test('the button hides where the browser can’t go full screen', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Document.prototype, 'fullscreenEnabled', { get: () => false })
  })
  await page.goto('/')
  await expect(page.getByRole('link', { name: /My stickers/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Big screen' })).toHaveCount(0)
})
