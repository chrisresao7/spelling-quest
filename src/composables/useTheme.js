import { computed, ref } from 'vue'
import { loadThemeConfig } from './content.js'

// The active theme. Components ask it for characters, lines, scene text and art,
// and never refer to a particular theme by name.

const theme = ref(null)
let cssLink = null

export async function applyTheme(id) {
  const config = await loadThemeConfig(id)
  if (!cssLink) {
    cssLink = document.createElement('link')
    cssLink.rel = 'stylesheet'
    document.head.appendChild(cssLink)
  }
  cssLink.href = `${config.root}theme.css`
  document.documentElement.dataset.theme = id
  theme.value = config
  return config
}

function pick(list) {
  if (!list?.length) return ''
  return list[Math.floor(Math.random() * list.length)]
}

export function fill(text, vars = {}) {
  const t = theme.value
  const names = {
    hero: t?.characters?.hero?.name ?? 'Pup',
    sidekick: t?.characters?.sidekick?.name ?? 'Friend',
  }
  return (text || '').replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? names[k] ?? '')
}

export function useTheme() {
  const t = computed(() => theme.value)

  /** URL of a file inside the theme folder. */
  const asset = (path) => (path ? `${theme.value.root}${path}` : null)

  /** Character art for a speaker ("hero" or "sidekick") in a mood, falling back to any pose. */
  function characterArt(who, mood = 'happy') {
    const art = theme.value?.characters?.[who]?.art || {}
    return asset(art[mood] || art.happy || Object.values(art)[0])
  }

  function characterName(who) {
    return theme.value?.characters?.[who]?.name ?? ''
  }

  /** A random line of a kind (correct, tryAgain, ...) with {placeholders} filled in. */
  function line(kind, vars) {
    return fill(pick(theme.value?.lines?.[kind]), vars)
  }

  /** Story text and art for one scene of the chapter. */
  function scene(key) {
    const s = theme.value?.story?.scenes?.[key] || {}
    return {
      speaker: s.speaker || 'hero',
      title: fill(s.title || ''),
      intro: fill(s.intro || ''),
      outro: fill(s.outro || ''),
      background: asset(s.background),
      item: asset(s.item),
    }
  }

  return { theme: t, asset, characterArt, characterName, line, scene, fill }
}
