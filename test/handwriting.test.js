import { describe, expect, it } from 'vitest'
import { checkLetter, formationTip, LETTERS, letterGuide, LINES, pointCloud, tidy } from '../src/lib/handwriting.js'
import { messy, rng, scribble } from './handwriting-samples.js'

// The samples are made-up messy copies of the letter models (see handwriting-samples.js), so these
// numbers guard against the reader getting worse; a real child's writing is checked on a tablet.
const ALPHABET = Object.keys(LETTERS)

it('has a model for every lowercase letter', () => {
  expect(ALPHABET.join('')).toBe('abcdefghijklmnopqrstuvwxyz')
  for (const l of ALPHABET) expect(pointCloud(letterGuide(l)), l).toHaveLength(32)
})

it('models sit on the writing lines', () => {
  for (const l of ALPHABET) {
    const ys = letterGuide(l).flat().map((p) => p[1])
    expect(Math.max(...ys), l).toBeGreaterThanOrEqual(LINES.base - 1)
    if ('bdhkl'.includes(l)) expect(Math.min(...ys), l).toBeLessThanOrEqual(LINES.top + 1)
    if ('gjpqy'.includes(l)) expect(Math.max(...ys), l).toBeGreaterThan(LINES.base + 15)
  }
})

describe('reading a letter', () => {
  it('reads messy letters as the letter they are', () => {
    const r = rng(11)
    const missed = []
    for (const l of ALPHABET) for (let k = 0; k < 6; k++) if (!checkLetter(messy(l, r), l).ok) missed.push(l)
    expect(missed.length / (ALPHABET.length * 6)).toBeLessThan(0.03)
  })

  it('reads small letters written too big', () => {
    const r = rng(12)
    const missed = []
    for (const l of 'aceimnorsuvwxz') for (let k = 0; k < 4; k++) if (!checkLetter(messy(l, r, { big: true }), l).ok) missed.push(l)
    expect(missed.length).toBeLessThanOrEqual(2)
  })

  it('does not accept a different letter', () => {
    const r = rng(13)
    let wrong = 0
    let tries = 0
    for (const l of ALPHABET) {
      for (let k = 0; k < 4; k++) {
        const other = ALPHABET[(ALPHABET.indexOf(l) + 1 + Math.floor(r() * 25)) % 26]
        tries++
        if (checkLetter(messy(l, r), other).ok) wrong++
      }
    }
    expect(wrong / tries).toBeLessThan(0.03)
  })

  it('never mixes up letters that are mirror images', () => {
    const r = rng(14)
    for (const [a, b] of [['b', 'd'], ['d', 'b'], ['p', 'q'], ['q', 'p'], ['b', 'p'], ['n', 'u'], ['u', 'n']]) {
      for (let k = 0; k < 5; k++) {
        const res = checkLetter(messy(a, r), b)
        expect(res.ok, `${a} as ${b}`).toBe(false)
        expect(res.guess, `${a} as ${b}`).toBe(a)
      }
    }
  })

  it('does not accept a scribble', () => {
    const r = rng(15)
    let ok = 0
    for (let k = 0; k < 52; k++) if (checkLetter(scribble(r), ALPHABET[k % 26]).ok) ok++
    expect(ok).toBeLessThanOrEqual(4)
  })

  it('needs the dot to tell an i from an l', () => {
    const stem = [
      [50, 60],
      [50, 100],
    ]
    expect(checkLetter([stem, [[50, 44], [50, 44]]], 'i').ok).toBe(true)
    expect(checkLetter([stem, [[50, 44], [50, 44]]], 'l').ok).toBe(false)
  })

  it('knows an empty box is empty', () => {
    expect(checkLetter([], 'a')).toMatchObject({ empty: true, ok: false })
  })

  it('ignores a stray tap away from the letter', () => {
    const a = letterGuide('a')
    expect(tidy([...a, [[90, 140], [90, 140]]])).toEqual(a)
    expect(checkLetter([...a, [[90, 140], [90, 140]]], 'a').ok).toBe(true)
  })

  it('learns from her own samples', () => {
    // A wavy "w" the models read as an "m" is read as a "w" once she has shown it to the game.
    const wavy = [Array.from({ length: 40 }, (_, i) => [30 + i, 80 + 18 * Math.sin((i / 39) * Math.PI * 4)])]
    expect(checkLetter(wavy, 'w').ok).toBe(false)
    expect(checkLetter(wavy, 'w', { extra: { w: [wavy] } }).ok).toBe(true)
  })
})

describe('formation tips', () => {
  it('has nothing to say about a well-formed letter', () => {
    const r = rng(21)
    let tips = 0
    for (const l of ALPHABET) for (let k = 0; k < 5; k++) if (formationTip(messy(l, r, { formation: true }), l)) tips++
    expect(tips).toBeLessThanOrEqual(2)
  })

  it('spots a letter written from the bottom up', () => {
    const backwards = letterGuide('l').map((s) => [...s].reverse())
    expect(formationTip(backwards, 'l')).toBe('way')
  })

  it('spots a round letter going clockwise', () => {
    const clockwise = letterGuide('o').map((s) => [...s].reverse())
    expect(formationTip(clockwise, 'o')).toBe('way')
    expect(formationTip(letterGuide('c').map((s) => [...s].reverse()), 'c')).toBe('way')
  })

  it('spots a letter started in the wrong place', () => {
    // An "a" started at the bottom of its stem and going up, then round.
    const [stroke] = letterGuide('a')
    const fromStem = [[...stroke.slice(-12)].reverse(), stroke.slice(0, -12)]
    expect(['start', 'way']).toContain(formationTip(fromStem, 'a'))
  })

  it('spots letters that do not sit on the lines', () => {
    const shrink = (strokes) => strokes.map((s) => s.map(([x, y]) => [x, 80 + (y - 80) * 0.45]))
    expect(formationTip(shrink(letterGuide('h')), 'h')).toBe('tall')
    expect(formationTip(shrink(letterGuide('g')), 'g')).toBe('tail')
    const grow = (strokes) => strokes.map((s) => s.map(([x, y]) => [x, 100 + (y - 100) * 2]))
    expect(formationTip(grow(letterGuide('a')), 'a')).toBe('small')
  })
})
