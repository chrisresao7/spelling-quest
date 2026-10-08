<script setup>
// Sound Sort: put each word in the bag for the spelling of its sound (ai / ay / a-e / ea).
// Tap a bag, or drag the word onto it.
import { computed, onMounted, reactive, ref } from 'vue'
import SceneFrame from '../components/SceneFrame.vue'
import CharacterBubble from '../components/CharacterBubble.vue'
import SpeakButton from '../components/SpeakButton.vue'
import MarkedWord from '../components/MarkedWord.vue'
import { useTheme } from '../composables/useTheme.js'
import { useRound } from '../composables/useRound.js'
import { sayWord } from '../composables/useSpeech.js'
import { graphemeLabel } from '../lib/words.js'
import { useProgress } from '../stores/progress.js'

const props = defineProps({
  week: { type: Object, required: true },
  sceneKey: { type: String, default: 'soundSort' },
})
const emit = defineEmits(['done'])

const { scene, line } = useTheme()
const progress = useProgress()
const s = scene(props.sceneKey)

const round = useRound(props.week.words.filter((w) => w.pattern))
const sorted = reactive(Object.fromEntries(props.week.graphemes.map((g) => [g, []])))
const say = ref(s.prompt || line('prompt') || 'Which bag does this word go in?')
const mood = ref('happy')
const shaking = ref(null)
const showAnswer = ref(false)
const landed = ref(false)
let misses = 0
let busy = false

const word = computed(() => round.current.value)

function newWord() {
  misses = 0
  showAnswer.value = false
  landed.value = false
  if (word.value) sayWord(word.value.text)
}

function choose(g) {
  if (busy || !word.value) return
  const w = word.value
  if (g === w.pattern) {
    busy = true
    landed.value = true
    sorted[g].push(w)
    progress.recordAnswer(w.text, misses === 0)
    mood.value = 'happy'
    say.value = line('correct', { word: w.text })
    setTimeout(() => {
      round.next(misses === 0)
      busy = false
      if (round.finished.value) emit('done')
      else newWord()
    }, 1300)
  } else {
    misses++
    shaking.value = g
    setTimeout(() => (shaking.value = null), 450)
    mood.value = 'thinking'
    if (misses >= 2) {
      showAnswer.value = true
      say.value = props.week.tips[w.pattern] || line('tryAgain')
    } else {
      say.value = line('tryAgain')
    }
  }
}

// Drag support: pointer events work for both finger and mouse.
const drag = reactive({ active: false, x: 0, y: 0 })
function onDown(e) {
  if (busy) return
  drag.active = true
  drag.x = e.clientX
  drag.y = e.clientY
  e.target.setPointerCapture?.(e.pointerId)
}
function onMove(e) {
  if (!drag.active) return
  drag.x = e.clientX
  drag.y = e.clientY
}
function onUp(e) {
  if (!drag.active) return
  drag.active = false
  const el = document.elementsFromPoint(e.clientX, e.clientY).find((n) => n.dataset?.bucket)
  if (el) choose(el.dataset.bucket)
}

onMounted(newWord)
</script>

<template>
  <SceneFrame :background="s.background" :progress="round.progress.value" :item="s.item">
    <div v-if="word" class="card-row">
      <div
        :key="word.text + landed"
        class="card panel pop"
        :class="{ dragging: drag.active, landed }"
        :style="drag.active ? { position: 'fixed', left: `${drag.x}px`, top: `${drag.y}px`, transform: 'translate(-50%, -50%)' } : null"
        @pointerdown="onDown"
        @pointermove="onMove"
        @pointerup="onUp"
        @pointercancel="drag.active = false"
      >
        <MarkedWord :word="word" :highlight="landed || showAnswer" />
      </div>
      <SpeakButton :text="word.text" />
    </div>

    <div class="buckets">
      <button
        v-for="g in week.graphemes"
        :key="g"
        class="bucket"
        :class="{ shake: shaking === g, pulse: showAnswer && word?.pattern === g }"
        :data-bucket="g"
        @click="choose(g)"
      >
        <span class="label" :data-bucket="g">{{ graphemeLabel(g) }}</span>
        <span class="inside" :data-bucket="g">
          <span v-for="w in sorted[g]" :key="w.text" class="mini pop">{{ w.text }}</span>
        </span>
      </button>
    </div>

    <template #character>
      <CharacterBubble :who="s.speaker" :mood="mood" :text="say" />
    </template>
  </SceneFrame>
</template>

<style scoped>
.card-row {
  display: flex;
  align-items: center;
  gap: 20px;
  min-height: 120px;
}
.card {
  font-size: 3.4rem;
  padding: 10px 40px;
  touch-action: none;
  cursor: grab;
  z-index: 10;
}
.card.dragging {
  cursor: grabbing;
  box-shadow: 0 16px 30px rgba(0, 0, 0, 0.25);
}
.card.landed {
  outline: 6px solid var(--sq-good);
}
.buckets {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 18px;
  width: min(100%, 860px);
}
.bucket {
  position: relative;
  min-height: 210px;
  border-radius: 18px 18px 40px 40px;
  background: var(--sq-bucket, var(--sq-primary));
  color: var(--sq-primary-text);
  box-shadow: var(--sq-shadow);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 14px 10px;
  gap: 8px;
}
.bucket:nth-child(2) {
  background: var(--sq-bucket-2, var(--sq-accent));
}
.bucket:nth-child(3) {
  background: var(--sq-bucket-3, var(--sq-good));
}
.bucket:nth-child(4) {
  background: var(--sq-bucket-4, var(--sq-bad));
}
.bucket::before {
  /* the bag handle */
  content: '';
  position: absolute;
  top: -22px;
  width: 60px;
  height: 34px;
  border: 7px solid rgba(0, 0, 0, 0.25);
  border-bottom: none;
  border-radius: 30px 30px 0 0;
}
.label {
  font-size: 2.6rem;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.92);
  color: var(--sq-focus);
  border-radius: 14px;
  padding: 0 18px;
  min-width: 100px;
}
.inside {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
}
.mini {
  background: rgba(255, 255, 255, 0.85);
  color: var(--sq-surface-text);
  border-radius: 10px;
  padding: 0 10px;
  font-size: 1rem;
  font-weight: 700;
}
</style>
