import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// Every theme listed in index.json must have all its pictures and a story page for every game.
const ROOT = 'public/content/themes'
const { themes, default: first } = JSON.parse(readFileSync(join(ROOT, 'index.json'), 'utf8'))
const SCENES = ['soundSort', 'pickPatch', 'lookRight', 'spellIt', 'writeIt', 'tricky', 'trickyCatch', 'wordCatch']

function artPaths(theme) {
  const s = theme.story
  return [
    ...Object.values(theme.characters).flatMap((c) => Object.values(c.art)),
    theme.home?.background,
    s.background,
    s.endBackground,
    ...SCENES.flatMap((k) => [s.scenes[k].background, s.scenes[k].item]),
    ...theme.rewards,
  ].filter(Boolean)
}

it('the default theme is one of the themes', () => {
  expect(themes).toContain(first)
})

describe.each(themes)('the %s theme', (id) => {
  const theme = JSON.parse(readFileSync(join(ROOT, id, 'theme.json'), 'utf8'))

  it('has a scene for every game', () => {
    for (const k of SCENES) expect(theme.story.scenes[k]?.intro, k).toBeTruthy()
  })

  it('has every picture it names', () => {
    const missing = artPaths(theme).filter((p) => !existsSync(join(ROOT, id, p)))
    expect(missing).toEqual([])
  })

  it('styles itself under its own id', () => {
    expect(readFileSync(join(ROOT, id, 'theme.css'), 'utf8')).toContain(`[data-theme='${id}']`)
  })
})
