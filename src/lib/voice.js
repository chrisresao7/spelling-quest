// Voice clips: which lines the game can say, how a line is matched to a clip file, and
// which voice says it. Used by the game (src/composables/useSpeech.js) and by the clip
// generator (scripts/make-voice.mjs), so both always agree on the same lines and names.

import { GAME_LINES, stickerName } from './gameLines.js'

/**
 * Who is speaking. Story pages and the sticker book are the narrator, speech bubbles are
 * the scene's character, and spelling words have a voice of their own so they always
 * sound the same.
 */
export const ROLES = ['narrator', 'hero', 'sidekick', 'word']

/** The scenes that have a character talking in a bubble (see ChapterView). */
const GAME_SCENES = ['soundSort', 'pickPatch', 'lookRight', 'spellIt', 'tricky', 'trickyCatch']

/** Fill {hero}, {sidekick} and any vars; unknown {placeholders} are left in. */
export function fillText(theme, text, vars = {}) {
  const names = {
    hero: theme?.characters?.hero?.name ?? 'Pup',
    sidekick: theme?.characters?.sidekick?.name ?? 'Friend',
  }
  return (text || '').replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? names[k] ?? m)
}

/** Tidy a line for matching: single spaces, no stray punctuation at the start. */
export function norm(text) {
  return (text || '').replace(/\s+/g, ' ').replace(/^[\s.,!?;:]+/, '').trim()
}

function hash(str, seed) {
  // FNV-1a, 32 bits. Two seeds together make a clash between lines vanishingly unlikely.
  let h = seed >>> 0
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}

/** The clip file name (without .mp3) for a role saying a line. */
export function clipKey(role, text) {
  const s = `${role}|${norm(text)}`
  return `${role}-${hash(s, 0x811c9dc5)}${hash(s, 0x050c5d1f)}`
}

/**
 * Split a line into the pieces it can be stitched from: sentences, and single letters
 * where a word is spelt out ("Oops, that one says s e d. Keep looking!").
 */
export function speechUnits(text) {
  const units = []
  const sentences = (chunk) => {
    for (const s of chunk.split(/(?<=[.!?])\s+/)) {
      const n = norm(s)
      if (n) units.push(n)
    }
  }
  const letters = /\b[a-z](?: [a-z])+\b/g
  let last = 0
  let m
  while ((m = letters.exec(text))) {
    sentences(text.slice(last, m.index))
    units.push(...m[0].split(' '))
    last = m.index + m[0].length
  }
  sentences(text.slice(last))
  return units
}

/**
 * The clips to play, in order, for a line: the whole line if there's a clip for it,
 * otherwise the fewest clips that join up to make it. Null if it can't be made from clips.
 * @param {string} text
 * @param {(text: string) => boolean} has whether there's a clip for a piece of text
 */
export function planClips(text, has) {
  const whole = norm(text)
  if (!whole) return null
  if (has(whole)) return [whole]
  const units = speechUnits(text)
  // best[i]: fewest clips that make the first i units.
  const best = [[]]
  for (let i = 0; i < units.length; i++) {
    if (!best[i]) continue
    for (let j = i + 1; j <= units.length; j++) {
      const piece = units.slice(i, j).join(' ')
      if (has(piece) && (!best[j] || best[j].length > best[i].length + 1)) best[j] = [...best[i], piece]
    }
  }
  return best[units.length] || null
}

/** Voice settings for a role from the theme's `voice` block. */
export function roleVoice(theme, role) {
  const v = theme?.voice || {}
  return { ...(v[role] || (role === 'word' ? {} : v.narrator) || {}) }
}

/**
 * Every line the game can say with this theme and these weeks, as { role, text }.
 * The generator makes one clip for each; lines the game builds from parts (a spelt-out
 * word, a "try again" plus a hint) are covered by their parts, see planClips.
 */
export function spokenLines(theme, weeks) {
  const out = new Map()
  const add = (role, text) => {
    const t = norm(text)
    if (t && !t.includes('{')) out.set(clipKey(role, t), { role, text: t })
  }
  const words = [...new Set(weeks.flatMap((w) => [...w.words, ...w.tricky].map((x) => x.text)))]
  const fill = (t) => (t?.includes('{word}') ? words.map((word) => fillText(theme, t, { word })) : [fillText(theme, t)])
  // A line with {letters} is said as the part before, the letters, then the part after.
  const parts = (t) => fill(t).flatMap((x) => x.split('{letters}'))

  const story = theme.story || {}
  const scenes = story.scenes || {}
  const lines = theme.lines || {}

  // Narrator: story pages and the sticker book.
  for (const t of [story.title, story.intro, story.endTitle || GAME_LINES.endTitle, story.ending]) {
    fill(t).forEach((x) => add('narrator', x))
  }
  for (const t of lines.chapterEnd || []) fill(t).forEach((x) => add('narrator', x))
  for (const key of GAME_SCENES) {
    fill(scenes[key]?.title).forEach((x) => add('narrator', x))
    fill(scenes[key]?.intro).forEach((x) => add('narrator', x))
  }
  add('narrator', GAME_LINES.stickerLocked)
  for (const art of theme.rewards || []) add('narrator', stickerName(art))

  // Characters: whatever the scene's speaker says in their bubble.
  const speakers = new Set(GAME_SCENES.map((k) => scenes[k]?.speaker || 'hero'))
  for (const role of speakers) {
    for (const key of GAME_SCENES) parts(scenes[key]?.prompt).forEach((x) => add(role, x))
    for (const [k, t] of Object.entries(GAME_LINES)) {
      if (k !== 'stickerLocked' && k !== 'endTitle') parts(t).forEach((x) => add(role, x))
    }
    for (const kind of ['correct', 'tryAgain', 'prompt']) {
      for (const t of lines[kind] || []) parts(t).forEach((x) => add(role, x))
    }
    for (const w of weeks) for (const tip of Object.values(w.tips || {})) add(role, tip)
    for (const ch of 'abcdefghijklmnopqrstuvwxyz') add(role, ch)
  }

  // Spelling words.
  for (const w of words) add('word', w)

  return [...out.values()]
}

