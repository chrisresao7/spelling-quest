import { parseWeek } from '../lib/words.js'

// Weeks and themes live in public/content so they can be changed without touching code.
const base = `${import.meta.env.BASE_URL}content`

async function getJson(path) {
  const res = await fetch(`${base}/${path}`)
  if (!res.ok) throw new Error(`Couldn't load ${path} (${res.status})`)
  return res.json()
}

export async function loadWeekList() {
  const { weeks } = await getJson('weeks/index.json')
  const all = await Promise.all(weeks.map(loadWeek))
  // Newest week first.
  return all.sort((a, b) => b.id.localeCompare(a.id))
}

export async function loadWeek(id) {
  return parseWeek(await getJson(`weeks/${id}.json`))
}

export async function loadThemeList() {
  return getJson('themes/index.json')
}

export async function loadThemeConfig(id) {
  const config = await getJson(`themes/${id}/theme.json`)
  return { ...config, id, root: `${base}/themes/${id}/` }
}

// Common English words, so a real word is never shown as a "wrong" spelling.
// Built by scripts/make-wordlist.mjs. If it can't load, the games still work.
let dictionary = null
export function loadDictionary() {
  dictionary ||= fetch(`${base}/words-en.txt`)
    .then((res) => (res.ok ? res.text() : ''))
    .then((text) => new Set(text.split('\n').filter(Boolean)))
    .catch(() => new Set())
  return dictionary
}
