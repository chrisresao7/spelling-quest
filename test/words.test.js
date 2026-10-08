import { describe, expect, it } from 'vitest'
import { buildWith, misspellings, parseWeek, parseWord } from '../src/lib/words.js'
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
