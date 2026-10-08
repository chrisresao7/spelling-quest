// Makes the voice clips for every theme: one MP3 for each line the game can say, in the
// voices chosen in the theme's `voice` block (see THEMES.md). Only new lines are sent to
// the voice service, and clips for lines that are no longer used are removed.
//
//   GOOGLE_TTS_API_KEY=... npm run voice            make missing clips
//   npm run voice -- --check                        just count what's missing
//   GOOGLE_TTS_API_KEY=... npm run voice -- --samples   voice samples to choose from
//
// Runs by itself on GitHub when a week or theme changes (.github/workflows/voice.yml).

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseWeek } from '../src/lib/words.js'
import { clipKey, roleVoice, spokenLines } from '../src/lib/voice.js'

const CONTENT = 'public/content'
const KEY = process.env.GOOGLE_TTS_API_KEY
const API = 'https://texttospeech.googleapis.com/v1'
const args = process.argv.slice(2)

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'))

async function synthesize(text, voice) {
  const name = voice.name
  if (!name) throw new Error(`No voice name set for "${text}"`)
  const letter = /^[a-z]$/.test(text)
  const body = {
    // A single letter is said as its name ("ess"), not as a sound.
    input: letter ? { ssml: `<speak><say-as interpret-as="characters">${text}</say-as></speak>` } : { text },
    voice: { languageCode: name.split('-').slice(0, 2).join('-'), name },
    audioConfig: { audioEncoding: 'MP3', speakingRate: voice.rate ?? 1, pitch: voice.pitch ?? 0 },
  }
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${API}/text:synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': KEY },
      body: JSON.stringify(body),
    })
    if (res.ok) return Buffer.from((await res.json()).audioContent, 'base64')
    const msg = await res.text()
    // Some voices don't take SSML or a pitch: try again without.
    if (res.status === 400 && /ssml/i.test(msg) && body.input.ssml) {
      body.input = { text: `${text.toUpperCase()}.` }
      continue
    }
    if (res.status === 400 && /pitch/i.test(msg) && body.audioConfig.pitch !== undefined) {
      delete body.audioConfig.pitch
      continue
    }
    if ((res.status === 429 || res.status >= 500) && attempt < 4) {
      await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt))
      continue
    }
    throw new Error(`Voice service said ${res.status} for "${text}": ${msg.slice(0, 300)}`)
  }
}

async function makeTheme(id, weeks) {
  const theme = readJson(join(CONTENT, 'themes', id, 'theme.json'))
  if (theme.voice?.engine !== 'google') {
    console.log(`${id}: no voice set up, skipped (it uses the browser voice)`)
    return { missing: 0 }
  }
  const dir = join(CONTENT, 'themes', id, 'voice')
  mkdirSync(dir, { recursive: true })
  const lines = spokenLines(theme, weeks)
  const wanted = new Set(lines.map((l) => clipKey(l.role, l.text)))
  const todo = lines.filter((l) => !existsSync(join(dir, `${clipKey(l.role, l.text)}.mp3`)))
  const chars = todo.reduce((n, l) => n + l.text.length, 0)
  console.log(`${id}: ${lines.length} lines, ${todo.length} new (${chars} characters)`)

  if (args.includes('--check')) return { missing: todo.length }
  if (todo.length && !KEY) throw new Error('GOOGLE_TTS_API_KEY is not set')

  for (const l of todo) {
    const mp3 = await synthesize(l.text, roleVoice(theme, l.role))
    writeFileSync(join(dir, `${clipKey(l.role, l.text)}.mp3`), mp3)
    process.stdout.write('.')
  }
  process.stdout.write('\n')

  // Remove clips for lines that are no longer said, and list the rest for the game.
  const have = readdirSync(dir).filter((f) => f.endsWith('.mp3'))
  for (const f of have) if (!wanted.has(f.replace(/\.mp3$/, ''))) rmSync(join(dir, f))
  const clips = [...wanted].filter((k) => existsSync(join(dir, `${k}.mp3`))).sort()
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify({ clips }, null, 0) + '\n')
  return { missing: 0 }
}

async function samples() {
  if (!KEY) throw new Error('GOOGLE_TTS_API_KEY is not set')
  const out = 'voice-samples'
  mkdirSync(out, { recursive: true })
  const lines = {
    'en-AU': "G'day! It's a hot, sunny day, and we're off to the beach. Can you help us pack?",
    'en-GB': 'make. sail. clay. great. said.',
  }
  const list = []
  for (const [lang, text] of Object.entries(lines)) {
    const res = await fetch(`${API}/voices?languageCode=${lang}`, { headers: { 'X-Goog-Api-Key': KEY } })
    if (!res.ok) throw new Error(`Couldn't list voices: ${res.status} ${await res.text()}`)
    const voices = (await res.json()).voices
      .filter((v) => (lang === 'en-AU' ? /Neural2|Chirp3-HD/ : /Neural2/).test(v.name))
      .sort((a, b) => a.name.localeCompare(b.name))
    for (const v of voices) {
      const file = `${v.name}-${v.ssmlGender.toLowerCase()}.mp3`
      try {
        writeFileSync(join(out, file), await synthesize(text, { name: v.name, rate: lang === 'en-GB' ? 0.8 : 1 }))
        list.push(file)
        process.stdout.write('.')
      } catch (e) {
        console.log(`\n${v.name}: ${e.message}`)
      }
    }
  }
  writeFileSync(join(out, 'index.txt'), list.join('\n') + '\n')
  console.log(`\n${list.length} samples in ${out}/`)
}

if (args.includes('--samples')) {
  await samples()
} else {
  const weekIds = readJson(join(CONTENT, 'weeks/index.json')).weeks
  const weeks = weekIds.map((id) => parseWeek(readJson(join(CONTENT, 'weeks', `${id}.json`))))
  const { themes } = readJson(join(CONTENT, 'themes/index.json'))
  let missing = 0
  for (const id of themes) missing += (await makeTheme(id, weeks)).missing
  if (args.includes('--check') && missing) console.log(`${missing} clips still to make; the browser voice says those for now.`)
}
