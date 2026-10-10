<script setup>
// Grown-ups: record the week's sounds (and any word) in your own voice, and show the
// writing game how she writes her letters.
// The game plays these instead of the computer voice. See useRecordings.js for where they're kept.
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import HandwritingSamples from '../components/HandwritingSamples.vue'
import { loadWeekList } from '../composables/content.js'
import { deleteRecording, recordings, saveRecording, sharing, syncRecordings } from '../composables/useRecordings.js'
import { speak, stopSpeaking } from '../composables/useSpeech.js'
import { encodeWav, toMono, trimSilence } from '../lib/wav.js'
import { graphemeLabel } from '../lib/words.js'

const weeks = ref([])
const active = ref(null) // key being recorded
const busy = ref(null) // key being saved
const problem = ref('')
let recorder = null
let stream = null
let autoStop = null

onMounted(async () => {
  weeks.value = await loadWeekList()
  syncRecordings()
})
onBeforeUnmount(() => recorder?.state === 'recording' && recorder.stop())

const rows = (w) => [
  ...(w.sound
    ? [{ key: `sound:${w.sound}`, role: 'sound', say: w.sound, label: `/${w.sound}/ sound`, hint: `as in ${w.graphemes.map(graphemeLabel).join(', ')}` }]
    : []),
  ...[...w.words, ...w.tricky].map((x) => ({ key: `word:${x.text}`, role: 'word', say: x.text, label: x.text })),
]

async function toWav(blob) {
  const ctx = new AudioContext()
  try {
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer())
    const samples = trimSilence(toMono(buf), buf.sampleRate)
    if (samples.length < buf.sampleRate * 0.1) return null
    return new Blob([encodeWav(samples, buf.sampleRate)], { type: 'audio/wav' })
  } finally {
    ctx.close()
  }
}

async function start(row) {
  problem.value = ''
  stopSpeaking()
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
  } catch {
    problem.value = 'The microphone isn’t available. Allow microphone access for this site and try again.'
    return
  }
  const chunks = []
  recorder = new MediaRecorder(stream)
  recorder.ondataavailable = (e) => chunks.push(e.data)
  recorder.onstop = async () => {
    clearTimeout(autoStop)
    stream.getTracks().forEach((t) => t.stop())
    active.value = null
    busy.value = row.key
    try {
      const wav = await toWav(new Blob(chunks, { type: recorder.mimeType }))
      if (!wav) problem.value = 'That was too quiet to hear. Try again a little closer to the microphone.'
      else {
        await saveRecording(row.key, wav)
        speak(row.say, { role: row.role })
      }
    } catch {
      problem.value = 'Something went wrong saving that recording. Please try again.'
    }
    busy.value = null
  }
  recorder.start()
  active.value = row.key
  autoStop = setTimeout(stop, 6000)
}

function stop() {
  if (recorder?.state === 'recording') recorder.stop()
}

function remove(row) {
  if (confirm(`Delete your recording of “${row.label}”?`)) deleteRecording(row.key)
}
</script>

<template>
  <div class="grown-ups">
    <header class="top">
      <RouterLink to="/" class="btn secondary" @click="stopSpeaking()">Back to the game</RouterLink>
    </header>

    <section class="panel intro">
      <h1>Record your voice</h1>
      <p>
        Record each week’s sound the way school teaches it. The game plays your recording when the sound
        button is tapped. You can also record any word, and the game will use your voice for it instead of the
        computer voice.
      </p>
      <p class="status" :class="{ off: sharing.on === false }">
        <template v-if="sharing.on">Recordings are shared with every device that opens the game.</template>
        <template v-else-if="sharing.on === false">
          Recordings are saved on this device only for now (sharing isn’t set up here, or you’re offline).
        </template>
        <template v-else>Checking whether recordings can be shared…</template>
      </p>
      <p v-if="problem" class="problem" role="alert">{{ problem }}</p>
    </section>

    <section v-for="w in weeks" :key="w.id" class="panel week">
      <h2>{{ w.title }}</h2>
      <ul>
        <li v-for="row in rows(w)" :key="row.key" :class="{ sound: row.role === 'sound' }">
          <span class="label">
            <strong>{{ row.label }}</strong>
            <small v-if="row.hint">{{ row.hint }}</small>
          </span>
          <span class="state">
            <template v-if="active === row.key">Recording… tap Stop when you’ve finished</template>
            <template v-else-if="busy === row.key">Saving…</template>
            <template v-else-if="recordings[row.key]">Your voice</template>
            <template v-else-if="row.role === 'sound'">Not recorded yet</template>
            <template v-else>Computer voice</template>
          </span>
          <span class="actions">
            <button v-if="active === row.key" class="btn rec on" @click="stop">Stop</button>
            <button v-else class="btn rec" :disabled="!!active || !!busy" @click="start(row)">
              {{ recordings[row.key] ? 'Record again' : 'Record' }}
            </button>
            <button
              v-if="recordings[row.key] || row.role === 'word'"
              class="btn secondary"
              :disabled="!!active"
              @click="speak(row.say, { role: row.role })"
            >
              Play
            </button>
            <button v-if="recordings[row.key]" class="btn secondary" :disabled="!!active" @click="remove(row)">
              Delete
            </button>
          </span>
        </li>
      </ul>
    </section>

    <HandwritingSamples />
  </div>
</template>

<style scoped>
.grown-ups {
  min-height: 100dvh;
  padding: max(24px, env(safe-area-inset-top)) 24px 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  background: var(--sq-bg);
}
.top,
section {
  width: min(100%, 860px);
}
.top .btn {
  text-decoration: none;
}
.intro,
.week {
  padding: 20px 28px;
}
h1,
h2 {
  margin: 0 0 8px;
  color: var(--sq-primary);
}
.status {
  color: var(--sq-good);
  font-weight: 700;
}
.status.off {
  color: var(--sq-muted);
}
.problem {
  color: var(--sq-focus);
  font-weight: 700;
}
ul {
  list-style: none;
  margin: 0;
  padding: 0;
}
li {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-areas: 'label actions' 'state actions';
  align-items: center;
  gap: 2px 16px;
  padding: 12px 0;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}
li.sound .label strong {
  color: var(--sq-focus);
}
.label {
  grid-area: label;
  display: flex;
  gap: 10px;
  align-items: baseline;
  font-size: 1.3rem;
}
.label small {
  font-size: 0.9rem;
  color: var(--sq-muted);
}
.state {
  grid-area: state;
  font-size: 0.9rem;
  color: var(--sq-muted);
}
.actions {
  grid-area: actions;
  display: flex;
  gap: 8px;
}
.actions .btn {
  min-height: 48px;
  padding: 10px 16px;
  font-size: 1rem;
}
.actions .btn:disabled {
  opacity: 0.5;
}
.rec.on {
  background: var(--sq-focus);
}
</style>
