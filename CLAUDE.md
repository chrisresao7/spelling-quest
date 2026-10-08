# Spelling Quest

A story-based spelling game for a child learning phonics (Year 1/2, UK). Vue 3 + Vite, static site.
See README.md for how it works and THEMES.md for themes.

## Learning rules (from Chris; these always apply)

These rules protect what the child is being taught. Every game, theme, week file and future change
must follow them. Each one is covered by a test; keep those tests passing and add one for any new game.

1. **A wrong option is never a real word.** When a game shows wrong spellings next to the right one
   (Which Looks Right?, Tricky Word Catch, or any future game), none of them may be a real English
   word. For example, *sale* is a correct spelling (just not of *sail*), so it must never appear as
   the wrong answer for *sail*; the same goes for *pane*/*pain*, *maid*/*made*, *grate*/*great*.
   - How: wrong options come from `lookalikes()` in `src/lib/words.js`, which drops anything in the
     dictionary `public/content/words-en.txt` (built by `npm run wordlist`). Never build wrong
     options another way.
   - Tests: `test/words.test.js` ("real words are never wrong options", "with the real dictionary").
2. **A split spelling is shown with two gaps.** For a split digraph such as a‑e (*made*, *make*),
   a word with the sound missing is shown as **m _ d _**, never **m _ d**, because one gap looks like
   a two-letter spelling (ai, ay, ea) and teaches the wrong pattern.
   - How: `PickPatch.vue` adds a second gap when the word's pattern contains `_`. Any new game that
     hides the sound's letters must do the same.
   - Tests: `e2e/chapter.spec.js` reads the gaps as `m?d?`.

Other teaching choices already in place: the sound's letters are shown in red like the school sheet
(`--sq-focus`), wrong answers never cost lives, missed words come back later in the round, and the
teacher's tips from the week file are used as hints.
