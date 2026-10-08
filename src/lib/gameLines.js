// Things the games say that don't come from the theme. Kept in one place so the voice
// generator (scripts/make-voice.mjs) can make a clip for every one of them.
// {letters} is a word spelt out letter by letter, e.g. "s a i d".

export const GAME_LINES = {
  soundSortPrompt: 'Which bag does this word go in?',
  pickPatchPrompt: 'Listen, then pick the missing letters!',
  lookRightPrompt: 'Which one is spelt right?',
  spellItLook: 'Look at the word and say it. When you’re ready, tap the button!',
  spellItBuild: 'Now spell it with the letters!',
  spellItMissed: 'Look at the red letters. We’ll try this one again soon.',
  catchPrompt: 'Listen, then catch the bubble that’s spelt right!',
  catchOops: 'Oops, that one says {letters}. Keep looking!',
  catchAway: 'It floated away! It’s spelt {letters}. We’ll try again.',
  endTitle: 'Hooray!',
  stickerLocked: 'Play a chapter to win this sticker!',
}

/** "said" -> "s a i d", for saying a word letter by letter. */
export const spellOut = (text) => text.split('').join(' ')

/** "art/sticker-crab.svg" -> "crab" */
export const stickerName = (art) =>
  art.split('/').pop().replace(/\.\w+$/, '').replace(/^sticker-/, '').replace(/-/g, ' ')
