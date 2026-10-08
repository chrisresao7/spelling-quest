// Builds public/content/words-en.txt: common British English words, used so the games
// never show a real word as a "wrong" spelling (e.g. "sale" next to "sail").
// Run with `npm run wordlist` (only needed if the source list or the filter changes).
import { writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const levels = [10, 20, 35, 40, 50, 55]
const words = new Set()
// SCOWL lists up to size 55: everyday words plus less common ones. "english" holds words shared by
// every dialect, "british" the British-only spellings.
for (const dialect of ['english', 'british']) for (const n of levels) {
  for (const w of require(`wordlist-english/${dialect}-words-${n}.json`)) {
    if (/^[a-z]{2,9}$/.test(w)) words.add(w)
  }
}
// Single letters that are words.
words.add('a')
words.add('i')
writeFileSync('public/content/words-en.txt', [...words].sort().join('\n') + '\n')
console.log(`${words.size} words`)
