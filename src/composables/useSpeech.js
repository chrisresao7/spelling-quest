// Everything the game says goes through here. For each line it plays, in order of choice:
//   1. a grown-up's own recording (spelling words and sounds, see useRecordings.js),
//   2. the theme's voice clips (made by scripts/make-voice.mjs, see THEMES.md),
//   3. the browser's built-in voice, so the game never goes quiet.

import { clipKey, planClips, roleVoice } from '../lib/voice.js'
import { getRecording } from './useRecordings.js'

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null
export const canSpeak = !!synth || (typeof window !== 'undefined' && !!window.AudioContext)

// ---- The theme's voice ----

let theme = null
let clips = new Set()

/** Called when a theme is switched on: reads its list of voice clips, if it has any. */
export async function loadVoice(config) {
  theme = config
  clips = new Set()
  buffers.clear()
  try {
    const res = await fetch(`${config.root}voice/manifest.json`)
    if (res.ok) clips = new Set((await res.json()).clips)
  } catch {
    // No clips yet: the browser voice is used.
  }
}

// ---- Playing audio ----

let ctx = null
function audio() {
  if (!ctx && typeof window !== 'undefined' && window.AudioContext) ctx = new AudioContext()
  return ctx
}
// Tablets only allow sound after a tap, so wake the audio up on the first one.
if (typeof window !== 'undefined') {
  const unlock = () => audio()?.resume()
  window.addEventListener('pointerdown', unlock, { capture: true })
  window.addEventListener('keydown', unlock, { capture: true })
}

const buffers = new Map() // url or recording key -> Promise<AudioBuffer>
function decode(id, getData) {
  if (!buffers.has(id)) {
    const p = getData()
      .then((data) => audio().decodeAudioData(data))
      .catch(() => {
        buffers.delete(id)
        return null
      })
    buffers.set(id, p)
  }
  return buffers.get(id)
}

const clipBuffer = (role, text) => {
  const url = `${theme.root}voice/${clipKey(role, text, roleVoice(theme, role))}.mp3`
  return decode(url, () => fetch(url).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject())))
}
const recordingBuffer = (key, blob) => decode(`${key}@${blob.size}`, () => blob.arrayBuffer())

let generation = 0
let playing = []

function playBuffers(list, gen) {
  const c = audio()
  return new Promise((resolve) => {
    if (gen !== generation || !list.length) return resolve()
    let t = c.currentTime + 0.02
    list.forEach((buf, i) => {
      const src = c.createBufferSource()
      src.buffer = buf
      src.connect(c.destination)
      src.start(t)
      t += buf.duration + 0.06
      playing.push(src)
      if (i === list.length - 1) src.onended = () => resolve()
    })
    // In case a browser never reports the end.
    setTimeout(resolve, (t - c.currentTime) * 1000 + 500)
  })
}

// ---- The browser's own voice ----

let deviceVoices = []
function readVoices() {
  deviceVoices = synth?.getVoices() || []
}
if (synth) {
  readVoices()
  synth.addEventListener?.('voiceschanged', readVoices)
}

function deviceVoice(lang) {
  return (
    deviceVoices.find((v) => v.lang === lang) ||
    deviceVoices.find((v) => v.lang === 'en-GB' && /female|serena|kate|libby|sonia|martha/i.test(v.name)) ||
    deviceVoices.find((v) => v.lang === 'en-GB') ||
    deviceVoices.find((v) => v.lang?.startsWith('en')) ||
    null
  )
}

function browserSay(text, role, gen) {
  if (!synth || gen !== generation) return Promise.resolve()
  const v = roleVoice(theme, role)
  const lang = theme?.voice?.browser?.lang || v.name?.slice(0, 5) || 'en-GB'
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text)
    const voice = deviceVoice(lang)
    if (voice) u.voice = voice
    u.lang = voice?.lang || lang
    u.rate = role === 'word' ? 0.75 : 0.95
    u.pitch = Math.min(2, Math.max(0.5, 1.05 + (v.pitch || 0) / 20))
    u.onend = u.onerror = () => resolve()
    // Some browsers never fire onend, so don't let the game wait forever.
    setTimeout(resolve, 1500 + text.length * 120)
    synth.speak(u)
  })
}

// ---- Saying things ----

async function sayOne(text, role, gen) {
  if (typeof window !== 'undefined' && window.__sqSpoken) window.__sqSpoken.push({ role, text })
  const c = audio()
  // Before the first tap the audio can't start; don't wait on it, use the browser voice.
  if (c && c.state !== 'running') await Promise.race([c.resume().catch(() => {}), new Promise((r) => setTimeout(r, 150))])
  const audible = c?.state === 'running'

  if (audible && (role === 'word' || role === 'sound')) {
    const key = `${role}:${text}`
    const blob = getRecording(key)
    const buf = blob && (await recordingBuffer(key, blob))
    if (buf) return playBuffers([buf], gen)
  }
  if (audible && theme && clips.size) {
    const plan = planClips(text, (t) => clips.has(clipKey(role, t, roleVoice(theme, role))))
    if (plan) {
      const list = await Promise.all(plan.map((t) => clipBuffer(role, t)))
      if (list.every(Boolean)) return playBuffers(list, gen)
    }
  }
  if (role === 'sound') return // a sound is only ever said in a grown-up's voice
  return browserSay(text, role, gen)
}

let chain = Promise.resolve()

/**
 * Say something. `role` is who says it: "narrator", "hero", "sidekick", "word" (a spelling
 * word, said slowly) or "sound" (the week's sound, only from a recording).
 * `text` can be a list of lines said one after another.
 * `queue` waits for whatever is being said to finish instead of interrupting it.
 * Resolves when finished.
 */
export function speak(text, { role = 'narrator', queue = false } = {}) {
  const lines = (Array.isArray(text) ? text : [text]).filter(Boolean)
  if (!lines.length) return Promise.resolve()
  if (!queue) stopSpeaking()
  const gen = generation
  const run = async () => {
    for (const line of lines) {
      if (gen !== generation) return
      await sayOne(line, role, gen)
    }
  }
  chain = queue ? chain.then(run) : run()
  return chain
}

export function stopSpeaking() {
  generation++
  synth?.cancel()
  for (const src of playing) {
    try {
      src.stop()
    } catch {
      // already finished
    }
  }
  playing = []
  chain = Promise.resolve()
}

/** Say a spelling word after the character has finished talking. */
export function sayWord(text, delay = 300) {
  setTimeout(() => speak(text, { role: 'word', queue: true }), delay)
}
