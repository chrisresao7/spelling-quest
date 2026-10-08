// Reads words and lines aloud with the browser's built-in voice.
// Prefers a British English voice when the device has one.

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null
let voice = null

function chooseVoice() {
  if (!synth) return
  const voices = synth.getVoices()
  voice =
    voices.find((v) => v.lang === 'en-GB' && /female|serena|kate|libby|sonia|martha/i.test(v.name)) ||
    voices.find((v) => v.lang === 'en-GB') ||
    voices.find((v) => v.lang?.startsWith('en')) ||
    null
}

if (synth) {
  chooseVoice()
  synth.addEventListener?.('voiceschanged', chooseVoice)
}

export const canSpeak = !!synth

/**
 * Say something. `slow` is for single spelling words.
 * `queue` waits for whatever is being said to finish instead of interrupting it.
 * Resolves when finished.
 */
export function speak(text, { slow = false, queue = false } = {}) {
  if (!synth || !text) return Promise.resolve()
  if (!queue) synth.cancel()
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text)
    if (voice) u.voice = voice
    u.lang = voice?.lang || 'en-GB'
    u.rate = slow ? 0.75 : 0.95
    u.pitch = 1.05
    u.onend = u.onerror = () => resolve()
    // Some browsers never fire onend, so don't let the game wait forever.
    setTimeout(resolve, 1500 + text.length * 120)
    synth.speak(u)
  })
}

export function stopSpeaking() {
  synth?.cancel()
}

/** Say a spelling word after the character has finished talking. */
export function sayWord(text, delay = 300) {
  setTimeout(() => speak(text, { slow: true, queue: true }), delay)
}
