// Made-up "child" handwriting for the tests: the letter models drawn wobbly, slanted, squashed,
// too big or too small, with strokes in a different order or backwards.
import { LETTERS } from '../src/lib/handwriting.js'

export function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const between = (r, a, b) => a + (b - a) * r()

/** A messy copy of a letter. `formation` keeps the stroke order and direction as modelled. */
export function messy(letter, r, { formation = false, big = false } = {}) {
  const ways = LETTERS[letter]
  const strokes = ways[Math.floor(r() * ways.length)]
  const sx = between(r, 0.75, 1.3) * (big ? 1.5 : 1)
  const sy = between(r, 0.8, 1.2) * (big ? 1.5 : 1)
  const shear = between(r, -0.25, 0.25)
  const rot = (between(r, -10, 10) * Math.PI) / 180
  const dx = between(r, -10, 10)
  const dy = between(r, -6, 6)
  const wobA = between(r, 0, 2.5)
  const wobF = between(r, 0.05, 0.2)
  const cx = 50
  const cy = big ? 60 : 80
  let out = strokes.map((s) =>
    s.map(([x, y], i) => {
      let u = (x - 50) * sx
      let v = (y - 80) * sy
      u += shear * v
      const ru = u * Math.cos(rot) - v * Math.sin(rot)
      const rv = u * Math.sin(rot) + v * Math.cos(rot)
      return [
        cx + ru + dx + wobA * Math.sin(i * wobF * 6) + between(r, -1, 1),
        cy + rv + dy + wobA * Math.cos(i * wobF * 5) + between(r, -1, 1),
      ]
    }),
  )
  if (!formation) {
    out = out.map((s) => (r() < 0.3 ? [...s].reverse() : s))
    if (r() < 0.3) out = [...out].reverse()
  }
  return out
}

/** A scribble that isn't any letter. */
export function scribble(r) {
  let p = [50, 80]
  const pts = [p]
  for (let i = 0; i < 40; i++) {
    p = [Math.min(95, Math.max(5, p[0] + between(r, -15, 15))), Math.min(145, Math.max(5, p[1] + between(r, -15, 15)))]
    pts.push(p)
  }
  return [pts]
}
