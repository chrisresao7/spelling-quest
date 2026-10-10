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

// A grown-up saves how she writes a letter, for the writing game to learn from.
test('a grown-up can save her handwriting', async ({ page }) => {
  await page.goto('/#/grown-ups')
  await expect(page.getByRole('heading', { name: 'Her handwriting' })).toBeVisible()
  await page.getByRole('button', { name: 'w', exact: true }).click()
  const pad = page.getByRole('img', { name: 'Write w' })
  // The mouse only reaches what's on screen.
  await pad.scrollIntoViewIfNeeded()
  // A wavy w, all in one go, nothing like the game's own w.
  async function writeWavyW() {
    const box = await pad.boundingBox()
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.53)
    await page.mouse.down()
    for (let i = 1; i <= 40; i++) {
      const x = 0.3 + (i / 40) * 0.4
      const y = (80 + 18 * Math.sin((i / 40) * Math.PI * 4)) / 150
      await page.mouse.move(box.x + box.width * x, box.y + box.height * y)
    }
    await page.mouse.up()
  }
  await writeWavyW()
  await page.getByRole('button', { name: 'Try it' }).click()
  await expect(page.getByText(/not “w”|can’t read this as “w”/)).toBeVisible()
  await page.getByRole('button', { name: 'Save her “w”' }).click()
  await expect(page.getByText(/now knows 1 of her “w”s/)).toBeVisible()

  // Now the game reads her w, and still does after a reload.
  await page.reload()
  await expect(page.getByRole('button', { name: 'w, 1 saved' })).toBeVisible()
  await page.getByRole('button', { name: 'w, 1 saved' }).click()
  await pad.scrollIntoViewIfNeeded()
  await writeWavyW()
  await page.getByRole('button', { name: 'Try it' }).click()
  await expect(page.getByText('The game reads this as “w”.')).toBeVisible()
})
