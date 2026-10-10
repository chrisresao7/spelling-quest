<script setup>
// Grown-ups: show the writing game how she writes her letters. Her samples are read alongside
// the game's own letter models, so a letter she forms her own way is still read as right.
import { computed, ref } from 'vue'
import LetterBox from './LetterBox.vue'
import { addLetterSample, clearLetterSamples, letterSamples } from '../composables/useLetterSamples.js'
import { checkLetter } from '../lib/handwriting.js'

const ALPHABET = [...'abcdefghijklmnopqrstuvwxyz']
const letter = ref('a')
const strokes = ref([])
const result = ref(null)
const count = (l) => letterSamples[l]?.length || 0

function pick(l) {
  letter.value = l
  clear()
}
function clear() {
  strokes.value = []
  result.value = null
}
function addStroke(pts) {
  strokes.value.push(pts)
  result.value = null
}
function tryIt() {
  if (!strokes.value.length) return
  result.value = checkLetter(strokes.value, letter.value, { extra: letterSamples })
}
function save() {
  if (!strokes.value.length) return
  addLetterSample(letter.value, strokes.value)
  clear()
  result.value = { saved: true }
}
function forget() {
  if (confirm(`Forget her samples of “${letter.value}”?`)) clearLetterSamples(letter.value)
}

const verdict = computed(() => {
  const r = result.value
  if (!r) return ''
  if (r.saved) return `Saved. The game now knows ${count(letter.value)} of her “${letter.value}”s.`
  if (r.ok) return `The game reads this as “${letter.value}”.`
  if (r.guess) return `The game reads this as “${r.guess}”, not “${letter.value}”. If that’s how she writes it, save it.`
  return `The game can’t read this as “${letter.value}” yet. If that’s how she writes it, save it.`
})
</script>

<template>
  <section class="panel samples">
    <h1>Her handwriting</h1>
    <p>
      If the writing game finds one of her letters hard to read, ask her to write it here and save it. The game
      learns her way of writing it. Samples are kept on this device.
    </p>
    <div class="letters">
      <button
        v-for="l in ALPHABET"
        :key="l"
        class="pick"
        :class="{ on: l === letter }"
        :aria-pressed="l === letter"
        :aria-label="count(l) ? `${l}, ${count(l)} saved` : l"
        @click="pick(l)"
      >
        {{ l }}<small v-if="count(l)">{{ count(l) }}</small>
      </button>
    </div>
    <div class="pad">
      <div class="box"><LetterBox :strokes="strokes" :label="`Write ${letter}`" @stroke="addStroke" /></div>
      <div class="side">
        <p class="verdict" :class="{ good: result?.ok }" aria-live="polite">{{ verdict }}</p>
        <div class="actions">
          <button class="btn secondary" :disabled="!strokes.length" @click="tryIt">Try it</button>
          <button class="btn" :disabled="!strokes.length" @click="save">Save her “{{ letter }}”</button>
          <button class="btn secondary" :disabled="!strokes.length" @click="clear">Clear</button>
        </div>
        <button v-if="count(letter)" class="btn secondary forget" @click="forget">Forget her “{{ letter }}”s</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.samples {
  padding: 20px 28px;
}
h1 {
  margin: 0 0 8px;
  color: var(--sq-primary);
}
.letters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 12px 0 18px;
}
.pick {
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: var(--sq-tile);
  border: 2px solid var(--sq-tile-edge);
  font-size: 1.5rem;
  font-weight: 700;
}
.pick.on {
  background: var(--sq-primary);
  border-color: var(--sq-primary);
  color: var(--sq-primary-text);
}
.pick small {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 20px;
  height: 20px;
  border-radius: 10px;
  background: var(--sq-good);
  color: #fff;
  font-size: 0.75rem;
  line-height: 20px;
}
.pad {
  display: flex;
  gap: 24px;
  align-items: flex-start;
  flex-wrap: wrap;
}
.box {
  width: 160px;
}
.side {
  flex: 1;
  min-width: 240px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.verdict {
  margin: 0;
  min-height: 2.6em;
  font-size: 1rem;
  color: var(--sq-muted);
}
.verdict.good {
  color: var(--sq-good);
  font-weight: 700;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.actions .btn,
.forget {
  min-height: 48px;
  padding: 10px 16px;
  font-size: 1rem;
}
.btn:disabled {
  opacity: 0.5;
}
.forget {
  align-self: flex-start;
}
</style>
