import { test, expect } from '@playwright/test'

// Rainbow Valley is the theme the game starts with, and the picker switches to Beach Day.
test('the theme picker swaps the story', async ({ page }) => {
  await page.goto('/')
  // The theme's name under the title (the picker lists it too, so look only at the text).
  await expect(page.getByRole('paragraph').getByText('Rainbow Valley', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: /spellings of/ }).click()
  await expect(page.getByRole('heading', { name: 'The faded rainbow' })).toBeVisible()

  await page.goto('/')
  await page.getByRole('combobox').selectOption({ label: 'Beach Day' })
  await page.getByRole('link', { name: /spellings of/ }).click()
  await expect(page.getByRole('heading', { name: 'Beach Day' })).toBeVisible()
})
