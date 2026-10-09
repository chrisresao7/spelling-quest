// Week files mark the letters that make the focus sound with square brackets,
// like the red letters on the school sheet: "m[a]k[e]", "s[ai]l", "cl[ay]".
// A word with no brackets (a tricky word like "said") has no pattern.

/**
 * Parse a marked-up word.
 * @param {string} src e.g. "m[a]k[e]"
 * @returns {{ text: string, parts: {t: string, focus: boolean}[], pattern: string|null,
 *             prefix: string, middle: string, suffix: string }}
 *
 * prefix / middle / suffix describe the word around the focus letters so that any
 * other spelling of the sound can be swapped in (see buildWith):
 *   "m[a]k[e]" -> prefix "m", middle "k", suffix ""
 *   "s[ai]l"   -> prefix "s", middle "l", suffix ""
 */
export function parseWord(src) {
  const parts = []
  const re = /\[([^\]]+)\]|([^[\]]+)/g
  let m
  while ((m = re.exec(src))) {
    if (m[1]) parts.push({ t: m[1], focus: true })
    else parts.push({ t: m[2], focus: false })
  }
  const text = parts.map((p) => p.t).join('')
  const focusIdx = parts.flatMap((p, i) => (p.focus ? [i] : []))
  const join = (from, to) => parts.slice(from, to).map((p) => p.t).join('')

  if (focusIdx.length === 0) {
    return { text, parts, pattern: null, prefix: text, middle: '', suffix: '' }
  }
  if (focusIdx.length > 2) throw new Error(`Too many [ ] groups in "${src}"`)

  const [a, b] = focusIdx
  const prefix = join(0, a)
  if (b === undefined) {
    return { text, parts, pattern: parts[a].t, prefix, middle: join(a + 1), suffix: '' }
  }
  return {
    text,
    parts,
    pattern: `${parts[a].t}_${parts[b].t}`,
    prefix,
    middle: join(a + 1, b),
    suffix: join(b + 1),
  }
}

/** Spell a parsed word using a different grapheme, e.g. make + "ai" -> "maik". */
export function buildWith(word, grapheme) {
  const [first, second = ''] = grapheme.split('_')
  return word.prefix + first + word.middle + second + word.suffix
}

/** How a grapheme is shown to a child: "a_e" reads as "a-e". */
export function graphemeLabel(g) {
  return g.replace('_', '‑')
}

/**
 * Misspellings of a word made by swapping in the other graphemes for its sound.
 * Used for "which looks right?" style choices.
 */
export function misspellings(word, graphemes) {
  if (!word.pattern) return []
  const out = new Set()
  for (const g of graphemes) {
    if (g === word.pattern) continue
    const s = buildWith(word, g)
    if (s !== word.text) out.add(s)
  }
  return [...out]
}

export function parseWeek(raw) {
  const words = raw.words.map(parseWord)
  for (const w of words) {
    if (w.pattern && !raw.graphemes.includes(w.pattern)) {
      throw new Error(`"${w.text}" uses ${w.pattern}, which is not in this week's graphemes`)
    }
  }
  return {
    ...raw,
    words,
    tricky: (raw.tricky || []).map(parseWord),
    // Wrong spellings to show for a word, from the week file. Older weeks only list them
    // for tricky words, as `trickyMistakes`.
    mistakes: { ...raw.trickyMistakes, ...raw.mistakes },
    tips: raw.tips || {},
  }
}

// Sounds that are often spelt the wrong way round, used to make believable wrong spellings
// of tricky words that don't follow this week's pattern ("said" -> "sed", "all" -> "orl").
const SOUND_SWAPS = [
  ['ai', 'e'],
  ['ai', 'ay'],
  ['a', 'o'],
  ['a', 'or'],
  ['e', 'ea'],
  ['ou', 'ow'],
  ['oo', 'u'],
  ['y', 'ie'],
]

/** Believable wrong spellings for any word: sound swaps, a dropped double letter, two letters swapped. */
export function wrongSpellings(text) {
  const out = new Set()
  for (const [from, to] of SOUND_SWAPS) {
    if (text.includes(from)) out.add(text.replace(from, to))
  }
  const doubled = text.match(/(\w)\1/)
  if (doubled) out.add(text.replace(doubled[0], doubled[1]))
  for (let i = 1; i < text.length - 1; i++) {
    if (text[i] !== text[i + 1]) out.add(text.slice(0, i) + text[i + 1] + text[i] + text.slice(i + 2))
  }
  out.delete(text)
  return [...out]
}

/**
 * Up to `count` wrong spellings to show beside a word. Ones listed in the week file come first,
 * then swaps of this week's spellings of the sound, then general look-alikes.
 *
 * RULE: a wrong option is never a real word. "sale" is a fine spelling, just not of "sail",
 * so showing it as wrong would teach the child something untrue. `isWord` checks the dictionary.
 */
export function lookalikes(word, graphemes, { extra = [], count = 2, rand = Math.random, isWord = () => false } = {}) {
  const pick = (list) => [...list].sort(() => rand() - 0.5)
  const all = [...new Set([...pick(extra), ...pick(misspellings(word, graphemes)), ...pick(wrongSpellings(word.text))])]
  return all.filter((s) => s !== word.text && !isWord(s)).slice(0, count)
}
