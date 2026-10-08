import { describe, expect, it } from 'vitest'
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
