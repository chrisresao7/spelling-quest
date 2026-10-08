import { test, expect } from '@playwright/test'

// A grown-up records the week's sound with a (fake) microphone, and the sound button
// then appears in the games.
test.use({
  permissions: ['microphone'],
  launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] },
})

test('a grown-up can record the week’s sound', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: /Grown-ups/ }).click()
  await expect(page.getByRole('heading', { name: 'Record your voice' })).toBeVisible()
  // The preview server has no shared store, so recordings stay on this device.
  await expect(page.getByText(/saved on this device only/)).toBeVisible()

  const row = page.locator('li', { hasText: '/ae/ sound' })
  await expect(row).toContainText('Not recorded yet')
  await row.getByRole('button', { name: 'Record' }).click()
  await expect(row).toContainText('Recording')
  await page.waitForTimeout(1200)
  await row.getByRole('button', { name: 'Stop' }).click()
  await expect(row).toContainText('Your voice', { timeout: 10_000 })
  await expect(row.getByRole('button', { name: 'Record again' })).toBeVisible()

  // Still there after a reload (kept in the browser).
  await page.reload()
  await expect(page.locator('li', { hasText: '/ae/ sound' })).toContainText('Your voice')

  // The sound button shows in Sound Sort.
  await page.goto('/')
  await page.getByRole('link', { name: /4 spellings of \/ae\// }).click()
  await page.getByRole('button', { name: 'Start!' }).click()
  await page.getByRole('button', { name: 'Let’s go!' }).click()
  await expect(page.getByRole('button', { name: 'Hear the sound' })).toBeVisible()
  await page.getByRole('button', { name: 'Hear the sound' }).click()

  // And it can be deleted.
  await page.goto('/#/grown-ups')
  page.once('dialog', (d) => d.accept())
  await page.locator('li', { hasText: '/ae/ sound' }).getByRole('button', { name: 'Delete' }).click()
  await expect(page.locator('li', { hasText: '/ae/ sound' })).toContainText('Not recorded yet')
})
