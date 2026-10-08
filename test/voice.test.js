import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { clipKey, fillText, planClips, roleVoice, speechUnits, spokenLines } from '../src/lib/voice.js'
import { GAME_LINES, spellOut, stickerName } from '../src/lib/gameLines.js'
import { parseWeek, wrongSpellings, misspellings } from '../src/lib/words.js'
import rawWeek from '../public/content/weeks/2026-09-30.json'

const week = parseWeek(rawWeek)
const themeFile = (id) => JSON.parse(readFileSync(`public/content/themes/${id}/theme.json`, 'utf8'))

describe('clipKey', () => {
  it('is the same for the same line, whatever the spacing', () => {
    expect(clipKey('hero', 'Too easy!')).toBe(clipKey('hero', '  Too   easy! '))
  })
  it('differs by speaker and by line', () => {
    expect(clipKey('hero', 'Too easy!')).not.toBe(clipKey('sidekick', 'Too easy!'))
    expect(clipKey('hero', 'Too easy!')).not.toBe(clipKey('hero', 'Too easy?'))
    expect(clipKey('word', 'said')).toMatch(/^word-[0-9a-f]{16}$/)
  })
  it('changes when the voice changes, so a new voice gets new clips', () => {
    const a = { name: 'en-AU-Neural2-B', rate: 0.95 }
    expect(clipKey('narrator', 'Hi!', a)).toBe(clipKey('narrator', 'Hi!', { ...a }))
    expect(clipKey('narrator', 'Hi!', a)).not.toBe(clipKey('narrator', 'Hi!', { ...a, name: 'en-AU-Neural2-D' }))
    expect(clipKey('narrator', 'Hi!', a)).not.toBe(clipKey('narrator', 'Hi!', { ...a, rate: 1 }))
  })
})

describe('planClips', () => {
  const has = (list) => (t) => list.includes(t)

  it('uses a clip for the whole line when there is one', () => {
    expect(planClips('Too easy!', has(['Too easy!']))).toEqual(['Too easy!'])
  })

  it('joins a "try again" line and a hint', () => {
    const text = `Ooh, so close! Have another go. ${GAME_LINES.spellItMissed}`
    expect(planClips(text, has(['Ooh, so close! Have another go.', GAME_LINES.spellItMissed]))).toEqual([
      'Ooh, so close! Have another go.',
      GAME_LINES.spellItMissed,
    ])
  })

  it('says a spelt-out word letter by letter', () => {
    const text = GAME_LINES.catchOops.replace('{letters}', spellOut('sed'))
    expect(speechUnits(text)).toEqual(['Oops, that one says', 's', 'e', 'd', 'Keep looking!'])
    expect(planClips(text, has(['Oops, that one says', 'Keep looking!', 's', 'e', 'd']))).toEqual([
      'Oops, that one says',
      's',
      'e',
      'd',
      'Keep looking!',
    ])
  })

  it('gives up when a piece is missing, so the browser voice says it', () => {
    expect(planClips('Something new.', has(['Too easy!']))).toBeNull()
  })
})

describe('roleVoice', () => {
  it('falls back to the narrator for characters but not for words', () => {
    const theme = { voice: { narrator: { name: 'en-AU-Neural2-B' } } }
    expect(roleVoice(theme, 'hero').name).toBe('en-AU-Neural2-B')
    expect(roleVoice(theme, 'word').name).toBeUndefined()
  })
})

// Everything a game can put in a speech bubble or on a story page, built the same way the
// games build it. Each one must be covered by the clips the generator makes.
function everythingSaid(theme) {
  const fill = (t, vars) => fillText(theme, t, vars)
  const scenes = theme.story.scenes
  const words = [...week.words, ...week.tricky].map((w) => w.text)
  const out = []
  const story = theme.story
  for (const t of [story.title, story.intro, story.endTitle || GAME_LINES.endTitle, story.ending]) out.push(['narrator', fill(t)])
  for (const t of theme.lines.chapterEnd) out.push(['narrator', fill(t)])
  for (const s of Object.values(scenes)) out.push(['narrator', fill(s.title)], ['narrator', fill(s.intro)])
  out.push(['narrator', GAME_LINES.stickerLocked])
  for (const art of theme.rewards) out.push(['narrator', stickerName(art)])

  for (const [key, s] of Object.entries(scenes)) {
    const who = s.speaker || 'hero'
    const say = (t) => out.push([who, t])
    say(fill(s.prompt))
    if (key === 'trickyCatch') for (const w of week.tricky) say(fill(s.prompt || GAME_LINES.catchPrompt).replace('{word}', w.text))
    for (const w of words) for (const t of theme.lines.correct) say(fill(t, { word: w }))
    for (const t of theme.lines.tryAgain) say(fill(t)), say(`${fill(t)} ${GAME_LINES.spellItMissed}`)
    for (const t of theme.lines.prompt || []) say(fill(t))
    for (const tip of Object.values(week.tips)) say(tip)
    for (const k of ['soundSortPrompt', 'pickPatchPrompt', 'lookRightPrompt', 'spellItLook', 'spellItBuild', 'catchPrompt']) say(GAME_LINES[k])
    for (const w of week.tricky) {
      const wrong = [...(week.trickyMistakes?.[w.text] || []), ...wrongSpellings(w.text)]
      for (const b of wrong) say(GAME_LINES.catchOops.replace('{letters}', spellOut(b)))
      say(GAME_LINES.catchAway.replace('{letters}', spellOut(w.text)))
    }
    for (const w of week.words) for (const b of misspellings(w, week.graphemes)) say(GAME_LINES.catchOops.replace('{letters}', spellOut(b)))
  }
  for (const w of words) out.push(['word', w])
  return out
}

describe.each(['bluey', '_template'])('voice clips for the %s theme', (id) => {
  const theme = themeFile(id)
  const lines = spokenLines(theme, [week])
  const has = (role) => (t) => lines.some((l) => l.role === role && l.text === t)

  it('cover every line the game can say', () => {
    const missing = everythingSaid(theme).filter(([role, text]) => text && !planClips(text, has(role)))
    expect(missing).toEqual([])
  })

  it('has a voice for every speaker', () => {
    expect(theme.voice.engine).toBe('google')
    for (const role of new Set(lines.map((l) => l.role))) expect(roleVoice(theme, role).name).toBeTruthy()
  })

  it('never has a {placeholder} left in a clip', () => {
    expect(lines.filter((l) => /[{}]/.test(l.text))).toEqual([])
  })
})
