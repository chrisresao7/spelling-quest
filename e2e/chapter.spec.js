import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { parseWeek } from '../src/lib/words.js'
import { planClips, spokenLines } from '../src/lib/voice.js'
import { encodeWav } from '../src/lib/wav.js'

// Plays the first chapter from start to sticker, answering everything right.
// Set SCREENSHOTS=dir to save a picture of each scene.
const week = parseWeek(JSON.parse(readFileSync('public/content/weeks/2026-09-30.json', 'utf8')))
const byText = Object.fromEntries(week.words.map((w) => [w.text, w]))
// Pick the Patch shows one gap, or two for a split spelling: "s?l", "m?d?".
const gapOf = (w) => (w.pattern.includes('_') ? `${w.prefix}?${w.middle}?${w.suffix}` : `${w.prefix}?${w.middle}${w.suffix}`)
const byGap = Object.fromEntries(week.words.map((w) => [gapOf(w), w]))

// Stand-in voice clips: every line the generator would make, each a short beep.
const theme = JSON.parse(readFileSync('public/content/themes/bluey/theme.json', 'utf8'))
const numbers = parseWeek(JSON.parse(readFileSync('public/content/weeks/2026-10-07.json', 'utf8')))
const lines = spokenLines(theme, [week, numbers])
const clipSet = new Set(lines.map((l) => l.key))
const beep = Buffer.from(encodeWav(Float32Array.from({ length: 2400 }, (_, i) => 0.3 * Math.sin(i / 4)), 24000))

async function withVoiceClips(page) {
  const played = []
  await page.route('**/themes/bluey/voice/manifest.json', (r) => r.fulfill({ json: { clips: [...clipSet] } }))
  await page.route('**/themes/bluey/voice/*.mp3', (r) => {
    played.push(r.request().url().split('/').pop())
    return r.fulfill({ body: beep, contentType: 'audio/mpeg' })
  })
  await page.addInitScript(() => {
    window.__sqSpoken = []
    window.__sqBrowserVoice = []
    const say = window.speechSynthesis?.speak?.bind(window.speechSynthesis)
    if (say) window.speechSynthesis.speak = (u) => (window.__sqBrowserVoice.push(u.text), say(u))
  })
  return played
}

async function snap(page, testInfo, name) {
  if (!process.env.SCREENSHOTS) return
  await page.waitForTimeout(400) // let the pop-in animations settle
  await page.screenshot({ path: `${process.env.SCREENSHOTS}/${testInfo.project.name}-${name}.png` })
}

async function spellRound(page, count) {
  for (let i = 0; i < count; i++) {
    const shown = page.locator('.show .word')
    await expect(shown).toBeVisible()
    const text = await shown.getAttribute('aria-label')
    await page.getByRole('button', { name: "I've got it!" }).click()
    for (const ch of text) {
      await page.locator('.tile:not(.used)', { hasText: new RegExp(`^\\s*${ch}\\s*$`) }).first().click()
    }
    await expect(page.locator('.slot.good')).toHaveCount(text.length)
    await expect(page.locator('.slot.good')).toHaveCount(0, { timeout: 5000 })
  }
}

test('a whole chapter can be played on a tablet', async ({ page }, testInfo) => {
  const played = await withVoiceClips(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Spelling Quest' })).toBeVisible()
  await snap(page, testInfo, '1-home')

  await page.getByRole('link', { name: /4 spellings of \/ae\// }).click()
  await expect(page.getByRole('heading', { name: 'Beach Day' })).toBeVisible()
  await snap(page, testInfo, '2-story')
  await page.getByRole('button', { name: 'Start!' }).click()

  // Sound Sort
  await expect(page.getByRole('heading', { name: 'Pack the beach bags' })).toBeVisible()
  await page.getByRole('button', { name: 'Let’s go!' }).click()
  for (let i = 0; i < week.words.length; i++) {
    const card = page.locator('.card .word')
    await expect(card).toBeVisible()
    const text = await card.getAttribute('aria-label')
    if (i === 1) await snap(page, testInfo, '3-sound-sort')
    await page.locator(`.bucket[data-bucket="${byText[text].pattern}"]`).click()
    await expect(page.locator('.card.landed')).toHaveCount(0, { timeout: 5000 })
  }

  // Pick the Patch
  await expect(page.getByRole('heading', { name: 'Sandcastle flags' })).toBeVisible()
  await page.getByRole('button', { name: 'Let’s go!' }).click()
  for (let i = 0; i < week.words.length; i++) {
    const flag = page.locator('.flag')
    await expect(flag).toContainText('?')
    const gap = (await flag.innerText()).replace(/\s/g, '')
    if (i === 1) await snap(page, testInfo, '4-pick-patch')
    const right = byGap[gap].pattern.replace('_', '‑')
    await page.locator('.choice', { hasText: right }).click()
    await expect(page.locator('.choice.right')).toHaveCount(0, { timeout: 5000 })
  }

  // Which Looks Right?
  await expect(page.getByRole('heading', { name: 'The ice-cream van' })).toBeVisible()
  await page.getByRole('button', { name: 'Let’s go!' }).click()
  for (let i = 0; i < week.words.length; i++) {
    const signs = page.locator('.sign')
    await expect(signs).toHaveCount(3)
    if (i === 1) await snap(page, testInfo, '4b-look-right')
    const texts = (await signs.allInnerTexts()).map((t) => t.trim())
    const right = texts.find((t) => byText[t])
    await signs.filter({ hasText: new RegExp(`^\\s*${right}\\s*$`) }).click()
    await expect(page.locator('.sign.right')).toHaveCount(0, { timeout: 5000 })
  }

  // Spell It
  await expect(page.getByRole('heading', { name: 'Write in the sand' })).toBeVisible()
  await page.getByRole('button', { name: 'Let’s go!' }).click()
  await expect(page.locator('.show .word')).toBeVisible()
  await snap(page, testInfo, '5-spell-look')
  await page.getByRole('button', { name: "I've got it!" }).click()
  await snap(page, testInfo, '6-spell-tiles')
  // Back to the look step so spellRound can start from the top: get this one wrong on purpose.
  const tiles = page.locator('.tile:not(.used)')
  while ((await page.locator('.slot:not(.filled)').count()) > 0) {
    await tiles.last().click()
  }
  await expect(page.getByRole('button', { name: 'OK!' })).toBeVisible()
  await snap(page, testInfo, '7-spell-check')
  await page.getByRole('button', { name: 'OK!' }).click()
  // The other six words, plus the missed one again.
  await spellRound(page, week.words.length)

  // Tricky words
  await expect(page.getByRole('heading', { name: 'Tricky rock pool' })).toBeVisible()
  await page.getByRole('button', { name: 'Let’s go!' }).click()
  await spellRound(page, week.tricky.length)

  // Tricky Word Catch: tap the bubble spelt right (dispatched, because the bubbles keep moving)
  const tricky = new Set(week.tricky.map((w) => w.text))
  await expect(page.getByRole('heading', { name: 'Bubble catch' })).toBeVisible()
  await page.getByRole('button', { name: 'Let’s go!' }).click()
  for (let i = 0; i < week.tricky.length * 2; i++) {
    const bubbles = page.locator('.pool .bubble:not(.caught)')
    await expect(bubbles).toHaveCount(3)
    if (i === 0) {
      await page.waitForTimeout(3500)
      await snap(page, testInfo, '7b-tricky-catch')
    }
    const texts = (await bubbles.allInnerTexts()).map((t) => t.trim())
    await bubbles.nth(texts.findIndex((t) => tricky.has(t))).dispatchEvent('click')
    await expect(page.locator('.pool .bubble.caught')).toHaveCount(0, { timeout: 5000 })
  }

  // The end, with a sticker
  await expect(page.getByText('You won a sticker!')).toBeVisible()
  await snap(page, testInfo, '8-end')
  await page.getByRole('button', { name: 'Sticker book' }).click()
  await expect(page.getByText(/1 of 8 Beach Day stickers/)).toBeVisible()
  await snap(page, testInfo, '9-stickers')

  // Everything that was said is covered by the theme's voice clips, and was played from them.
  const spoken = await page.evaluate(() => window.__sqSpoken)
  const has = (role) => (t) => lines.some((l) => l.role === role && l.text === t)
  expect(spoken.length).toBeGreaterThan(40)
  expect(spoken.filter(({ role, text }) => !planClips(text, has(role)))).toEqual([])
  expect(played.length).toBeGreaterThan(20)
  expect(played.every((f) => clipSet.has(f.replace('.mp3', '')))).toBe(true)
  expect(await page.evaluate(() => window.__sqBrowserVoice)).toEqual([])
})

// A week with no sound (the numbers): Which Looks Right?, Spell It, then a bubble catch of the words.
test('a week with no sound skips the sound games', async ({ page }) => {
  const played = await withVoiceClips(page)
  const words = new Set(numbers.words.map((w) => w.text))
  await page.goto('/')
  await page.getByRole('link', { name: /Numbers to ten/ }).click()
  await page.getByRole('button', { name: 'Start!' }).click()

  // Which Looks Right? straight away, with the week file's wrong spellings.
  await expect(page.getByRole('heading', { name: 'The ice-cream van' })).toBeVisible()
  await page.getByRole('button', { name: 'Let’s go!' }).click()
  for (let i = 0; i < numbers.words.length; i++) {
    const signs = page.locator('.sign')
    await expect(signs).toHaveCount(3)
    const texts = (await signs.allInnerTexts()).map((t) => t.trim())
    const right = texts.find((t) => words.has(t))
    for (const t of texts) if (t !== right) expect(numbers.mistakes[right]).toContain(t)
    await signs.filter({ hasText: new RegExp(`^\\s*${right}\\s*$`) }).click()
    await expect(page.locator('.sign.right')).toHaveCount(0, { timeout: 5000 })
  }

  await expect(page.getByRole('heading', { name: 'Write in the sand' })).toBeVisible()
  await page.getByRole('button', { name: 'Let’s go!' }).click()
  await spellRound(page, numbers.words.length)

  await expect(page.getByRole('heading', { name: 'Bubble catch' })).toBeVisible()
  await page.getByRole('button', { name: 'Let’s go!' }).click()
  for (let i = 0; i < numbers.words.length; i++) {
    const bubbles = page.locator('.pool .bubble:not(.caught)')
    await expect(bubbles).toHaveCount(3)
    const texts = (await bubbles.allInnerTexts()).map((t) => t.trim())
    await bubbles.nth(texts.findIndex((t) => words.has(t))).dispatchEvent('click')
    await expect(page.locator('.pool .bubble.caught')).toHaveCount(0, { timeout: 5000 })
  }

  await expect(page.getByText('You won a sticker!')).toBeVisible()
  const spoken = await page.evaluate(() => window.__sqSpoken)
  const has = (role) => (t) => lines.some((l) => l.role === role && l.text === t)
  expect(spoken.filter(({ role, text }) => !planClips(text, has(role)))).toEqual([])
  expect(played.length).toBeGreaterThan(20)
  expect(await page.evaluate(() => window.__sqBrowserVoice)).toEqual([])
})
