<script setup>
// Tricky Word Catch: bubbles float up, each with a spelling of a tricky word.
// Hear the word and tap the bubble spelt right before it floats away.
import { computed, onMounted, ref } from 'vue'
import SceneFrame from '../components/SceneFrame.vue'
import CharacterBubble from '../components/CharacterBubble.vue'
import SpeakButton from '../components/SpeakButton.vue'
import { useTheme } from '../composables/useTheme.js'
import { useRound } from '../composables/useRound.js'
import { canSpeak, sayWord } from '../composables/useSpeech.js'
import { lookalikes } from '../lib/words.js'
import { shuffle } from '../lib/queue.js'
import { useProgress } from '../stores/progress.js'
import { GAME_LINES, spellOut } from '../lib/gameLines.js'

const props = defineProps({
  week: { type: Object, required: true },
  // The words to catch: the week's tricky words unless given.
  words: { type: Array, default: null },
  sceneKey: { type: String, default: 'trickyCatch' },
  // How many times each tricky word has to be caught.
  repeats: { type: Number, default: 2 },
})
const emit = defineEmits(['done'])

const { scene, line } = useTheme()
const progress = useProgress()
const s = scene(props.sceneKey)

const round = useRound((props.words || props.week.tricky).flatMap((w) => Array(props.repeats).fill(w)))
const say = ref('')
const mood = ref('happy')
const bubbles = ref([])
const turn = ref(0)
let misses = 0
let busy = false

const word = computed(() => round.current.value)

function newTurn() {
  const w = word.value
  if (!w) return
  misses = 0
  turn.value++
  const wrong = lookalikes(w, [], { extra: props.week.mistakes[w.text], isWord: props.week.isWord })
  const lanes = shuffle([0, 1, 2])
  bubbles.value = shuffle([w.text, ...wrong]).map((text, i) => ({
    text,
    lane: lanes[i],
    delay: i * 0.7,
    state: 'up', // up | popped | caught
  }))
  mood.value = 'happy'
  say.value = fillPrompt(w.text)
  sayWord(w.text, 900)
}

function fillPrompt(text) {
  return (s.prompt || GAME_LINES.catchPrompt).replace('{word}', text)
}

function finish(gotIt) {
  busy = true
  setTimeout(() => {
    round.next(gotIt)
    busy = false
    if (round.finished.value) emit('done')
    else newTurn()
  }, 1300)
}

function tap(b) {
  if (busy || b.state !== 'up') return
  const w = word.value
  if (b.text === w.text) {
    b.state = 'caught'
    progress.recordAnswer(w.text, misses === 0)
    mood.value = 'happy'
    say.value = line('correct', { word: w.text })
    finish(misses === 0)
  } else {
    b.state = 'popped'
    misses++
    mood.value = 'thinking'
    say.value = GAME_LINES.catchOops.replace('{letters}', spellOut(b.text))
  }
}

// The right bubble got away: it comes back again later in the round.
function floatedAway(b) {
  if (busy || b.state !== 'up' || b.text !== word.value.text) return
  progress.recordAnswer(word.value.text, false)
  mood.value = 'thinking'
  say.value = GAME_LINES.catchAway.replace('{letters}', spellOut(b.text))
  finish(false)
}

onMounted(newTurn)
</script>

<template>
  <SceneFrame :background="s.background" :progress="round.progress.value" :item="s.item">
    <div v-if="word" class="ask">
      <SpeakButton :text="word.text" :size="80" />
      <span v-if="!canSpeak" class="target panel">{{ word.text }}</span>
    </div>

    <div class="pool">
      <template v-for="b in bubbles" :key="`${turn}-${b.text}`">
        <div
          v-if="b.state !== 'popped'"
          class="float"
          :class="[b.state, `lane-${b.lane}`]"
          :style="{ animationDelay: `${b.delay}s` }"
          @animationend="(e) => e.animationName.startsWith('rise') && floatedAway(b)"
        >
          <button class="bubble" :class="b.state" @click="tap(b)">{{ b.text }}</button>
        </div>
      </template>
    </div>

    <template #character>
      <CharacterBubble :who="s.speaker" :mood="mood" :text="say" />
    </template>
  </SceneFrame>
</template>

<style scoped>
.ask {
  display: flex;
  align-items: center;
  gap: 16px;
}
.target {
  font-size: 2.4rem;
  font-weight: 700;
  padding: 4px 28px;
}
.pool {
  position: relative;
  width: min(100%, 860px);
  flex: 1;
  min-height: 380px;
  overflow: hidden;
}
.float {
  position: absolute;
  bottom: -170px;
  margin-left: -85px;
  animation: rise 8s linear forwards;
}
.float.caught {
  animation-play-state: paused;
}
.bubble {
  width: 170px;
  height: 170px;
  border-radius: 50%;
  font-size: 2.4rem;
  font-weight: 700;
  color: var(--sq-surface-text);
  background: radial-gradient(circle at 32% 28%, rgba(255, 255, 255, 0.95) 0 12%, rgba(255, 255, 255, 0.55) 13% 40%, rgba(160, 225, 245, 0.55) 70%);
  border: 4px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 6px 18px rgba(31, 58, 95, 0.18);
  animation: wobble 2.2s ease-in-out infinite alternate;
}
.lane-0 {
  left: 18%;
}
.lane-1 {
  left: 50%;
}
.lane-2 {
  left: 82%;
}
.bubble.caught {
  animation: caught 0.6s ease-out forwards;
  background: var(--sq-good);
  color: #fff;
}
@keyframes rise {
  from {
    bottom: -170px;
  }
  to {
    bottom: 100%;
  }
}
@keyframes wobble {
  from {
    translate: -8px 0;
  }
  to {
    translate: 8px 0;
  }
}
@keyframes caught {
  50% {
    scale: 1.2;
  }
  to {
    scale: 0;
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  /* No floating: the bubbles wait in a row until one is tapped. */
  .float,
  .bubble {
    animation: none !important;
  }
  .float {
    bottom: 30%;
  }
}
@media (max-width: 640px) {
  .float {
    margin-left: -65px;
  }
  .bubble {
    width: 130px;
    height: 130px;
    font-size: 1.9rem;
  }
}
</style>
