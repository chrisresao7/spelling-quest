import { reactive } from 'vue'

// Her own way of writing letters, added from the Grown-ups page. The writing game reads her
// letters against these as well as its own models. Kept in this browser only.
const KEY = 'spelling-quest:letters:v1'
const MAX = 5 // samples kept per letter; the oldest goes first

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {}
  } catch {
    return {}
  }
}

/** letter -> list of samples, each a list of strokes. */
export const letterSamples = reactive(load())

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(letterSamples))
  } catch {
    // Storage full or private browsing: the samples last until the page is closed.
  }
}

export function addLetterSample(letter, strokes) {
  letterSamples[letter] = [...(letterSamples[letter] || []), strokes].slice(-MAX)
  save()
}

export function clearLetterSamples(letter) {
  delete letterSamples[letter]
  save()
}
