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
    tips: raw.tips || {},
  }
}
