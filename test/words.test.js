import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { buildWith, lookalikes, misspellings, parseWeek, parseWord, wrongSpellings } from '../src/lib/words.js'
import week from '../public/content/weeks/2026-09-30.json'

describe('parseWord', () => {
  it('reads a split digraph', () => {
    const w = parseWord('m[a]k[e]')
    expect(w).toMatchObject({ text: 'make', pattern: 'a_e', prefix: 'm', middle: 'k', suffix: '' })
    expect(w.parts.filter((p) => p.focus).map((p) => p.t)).toEqual(['a', 'e'])
  })

  it('reads a single grapheme', () => {
    expect(parseWord('s[ai]l')).toMatchObject({ text: 'sail', pattern: 'ai', prefix: 's', middle: 'l' })
    expect(parseWord('cl[ay]')).toMatchObject({ text: 'clay', pattern: 'ay', prefix: 'cl', middle: '' })
  })

  it('treats unmarked words as tricky words', () => {
    expect(parseWord('said')).toMatchObject({ text: 'said', pattern: null })
  })
})

describe('buildWith', () => {
  it('swaps graphemes in both directions', () => {
    expect(buildWith(parseWord('m[a]k[e]'), 'ai')).toBe('maik')
    expect(buildWith(parseWord('m[a]k[e]'), 'ay')).toBe('mayk')
    expect(buildWith(parseWord('s[ai]l'), 'a_e')).toBe('sale')
    expect(buildWith(parseWord('gr[ea]t'), 'ai')).toBe('grait')
    expect(buildWith(parseWord('p[ay]'), 'ay')).toBe('pay')
  })
})

describe('misspellings', () => {
  it('gives the other spellings of the sound', () => {
    expect(misspellings(parseWord('p[ai]n'), week.graphemes)).toEqual(['payn', 'pane', 'pean'])
    expect(misspellings(parseWord('said'), week.graphemes)).toEqual([])
  })
})

describe('week 1 file', () => {
  it('parses and every word uses one of its graphemes', () => {
    const w = parseWeek(week)
    expect(w.words.map((x) => x.text)).toEqual(['make', 'made', 'sail', 'pain', 'clay', 'pay', 'great'])
    expect(w.tricky.map((x) => x.text)).toEqual(['all', 'said'])
  })

  it('rejects a word whose sound is not listed', () => {
    expect(() => parseWeek({ ...week, words: ['b[oa]t'] })).toThrow(/oa/)
  })
})

describe('numbers week file', () => {
  const raw = JSON.parse(readFileSync('public/content/weeks/2026-10-07.json', 'utf8'))

  it('has no sound, keeps make as a review word, and lists mistakes for every word', () => {
    const w = parseWeek(raw)
    expect(w.sound).toBeUndefined()
    expect(w.words.map((x) => x.text)).toEqual(['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'make'])
    expect(w.words.at(-1).pattern).toBe('a_e')
    for (const x of w.words) expect(w.mistakes[x.text]?.length, x.text).toBeGreaterThanOrEqual(2)
  })

  it('still reads trickyMistakes from older week files', () => {
    expect(parseWeek(week).mistakes.said).toEqual(['sed', 'sayd', 'siad'])
  })
})

describe('wrongSpellings', () => {
  it('makes believable mistakes for tricky words', () => {
    expect(wrongSpellings('said')).toContain('sed')
    expect(wrongSpellings('all')).toEqual(expect.arrayContaining(['al', 'oll']))
    expect(wrongSpellings('said')).not.toContain('said')
  })
})

describe('lookalikes', () => {
  it('prefers the week file, then the sound swaps', () => {
    const said = parseWord('said')
    expect(lookalikes(said, [], { extra: ['sayd'], count: 1 })).toEqual(['sayd'])
    const sail = parseWord('s[ai]l')
    const two = lookalikes(sail, ['ai', 'ay', 'a_e', 'ea'])
    expect(two).toHaveLength(2)
    for (const s of two) expect(['sayl', 'sale', 'seal']).toContain(s)
  })

  it('never offers the right spelling as a wrong one', () => {
    for (const w of ['s[ai]l', 'p[ay]', 'm[a]k[e]', 'all', 'said'].map(parseWord)) {
      expect(lookalikes(w, ['ai', 'ay', 'a_e', 'ea'], { count: 5 })).not.toContain(w.text)
    }
  })
})

describe('real words are never wrong options', () => {
  const dict = new Set(['sale', 'seal', 'pea', 'grate', 'maid', 'pane'])
  const isWord = (s) => dict.has(s)
  const graphemes = ['ai', 'ay', 'a_e', 'ea']

  it('drops homophones and other real words', () => {
    for (const src of ['s[ai]l', 'p[ay]', 'gr[ea]t', 'm[a]d[e]', 'p[ai]n']) {
      const w = parseWord(src)
      const options = lookalikes(w, graphemes, { count: 10, isWord })
      for (const o of options) expect(dict.has(o)).toBe(false)
    }
    expect(lookalikes(parseWord('s[ai]l'), graphemes, { count: 10, isWord })).not.toContain('sale')
  })

  it('still finds two wrong spellings for every word on the list', () => {
    for (const w of week.words.map(parseWord)) {
      expect(lookalikes(w, graphemes, { isWord })).toHaveLength(2)
    }
  })
})

describe('with the real dictionary', () => {
  const dict = new Set(readFileSync('public/content/words-en.txt', 'utf8').split('\n'))
  const isWord = (s) => dict.has(s)

  it('knows the homophones that must never be shown as wrong', () => {
    for (const w of ['sale', 'pane', 'maid', 'grate', 'pea', 'seal']) expect(isWord(w)).toBe(true)
  })

  // Every week in the game, as the games ask for them: Which Looks Right? and the word catch
  // use a word's own sound swaps and the week file's `mistakes`; Tricky Word Catch the same.
  const weekIds = JSON.parse(readFileSync('public/content/weeks/index.json', 'utf8')).weeks
  it.each(weekIds)('gives every word in week %s two wrong spellings that are not real words', (id) => {
    const parsed = parseWeek(JSON.parse(readFileSync(`public/content/weeks/${id}.json`, 'utf8')))
    for (const w of parsed.words) {
      const options = lookalikes(w, parsed.graphemes, { extra: parsed.mistakes[w.text], isWord })
      expect(options, w.text).toHaveLength(2)
      for (const o of options) expect(isWord(o), o).toBe(false)
    }
    for (const w of parsed.tricky) {
      const options = lookalikes(w, [], { extra: parsed.mistakes[w.text], isWord })
      expect(options, w.text).toHaveLength(2)
      for (const o of options) expect(isWord(o), o).toBe(false)
    }
  })

  it('drops a real word even when the week file lists it as a mistake', () => {
    expect(lookalikes(parseWord('one'), [], { extra: ['won', 'wun'], count: 5, isWord })).not.toContain('won')
  })
})
