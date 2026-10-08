import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

// Everything Elodie has done, saved in this browser only.
const KEY = 'spelling-quest:progress:v1'

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {}
  } catch {
    return {}
  }
}

export const useProgress = defineStore('progress', () => {
  const saved = load()
  /** word text -> { right, wrong, lastSeen } */
  const words = ref(saved.words || {})
  /** week id -> { plays, lastPlayed } */
  const chapters = ref(saved.chapters || {})
  /** [{ theme, art, weekId, date }] */
  const stickers = ref(saved.stickers || [])
  const settings = ref({ theme: null, ...saved.settings })

  function recordAnswer(text, right) {
    const w = (words.value[text] ||= { right: 0, wrong: 0, lastSeen: null })
    if (right) w.right++
    else w.wrong++
    w.lastSeen = new Date().toISOString()
  }

  function completeChapter(weekId) {
    const c = (chapters.value[weekId] ||= { plays: 0, lastPlayed: null })
    c.plays++
    c.lastPlayed = new Date().toISOString()
  }

  /** Give the next sticker from this theme the child doesn't have yet. */
  function awardSticker(themeId, rewards, weekId) {
    if (!rewards?.length) return null
    const owned = new Set(stickers.value.filter((s) => s.theme === themeId).map((s) => s.art))
    const art = rewards.find((r) => !owned.has(r)) ?? rewards[Math.floor(Math.random() * rewards.length)]
    const sticker = { theme: themeId, art, weekId, date: new Date().toISOString() }
    stickers.value.push(sticker)
    return sticker
  }

  watch(
    [words, chapters, stickers, settings],
    () => {
      try {
        localStorage.setItem(
          KEY,
          JSON.stringify({ words: words.value, chapters: chapters.value, stickers: stickers.value, settings: settings.value }),
        )
      } catch {
        // Private browsing or storage full: the game still works, it just won't remember.
      }
    },
    { deep: true },
  )

  return { words, chapters, stickers, settings, recordAnswer, completeChapter, awardSticker }
})
