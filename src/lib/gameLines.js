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
  writeItLook: 'Look at the word and say it. When you’re ready, tap the button and write it!',
  writeItWrite: 'Now write it with your finger, one letter in each box.',
  writeItEmpty: 'Write a letter in every box, then tap Check.',
  writeItFix: 'Nearly! Watch how the red letters are written, then have another go.',
  writeItMissed: 'Here’s how it’s spelt. We’ll write this one again soon.',
  writeTipStart: 'Lovely! Next time, start that letter at the green dot.',
  writeTipWay: 'Lovely! Watch which way that letter goes, and try it that way next time.',
  writeTipTall: 'Lovely! Next time, make that letter stretch up to the top line.',
  writeTipTail: 'Lovely! Next time, give that letter a tail that hangs below the line.',
  writeTipSmall: 'Lovely! Next time, keep that letter small, under the dotted line.',
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
