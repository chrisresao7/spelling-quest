<script setup>
// Spell It: Look, Say, Cover, Write, Check, with letter tiles for a tablet.
import { computed, onMounted, ref } from 'vue'
import SceneFrame from '../components/SceneFrame.vue'
import CharacterBubble from '../components/CharacterBubble.vue'
import SpeakButton from '../components/SpeakButton.vue'
import MarkedWord from '../components/MarkedWord.vue'
import { useTheme } from '../composables/useTheme.js'
import { useRound } from '../composables/useRound.js'
import { sayWord } from '../composables/useSpeech.js'
import { shuffle } from '../lib/queue.js'
import { useProgress } from '../stores/progress.js'
import { GAME_LINES } from '../lib/gameLines.js'

const props = defineProps({
  words: { type: Array, required: true },
  graphemes: { type: Array, default: () => [] },
  sceneKey: { type: String, default: 'spellIt' },
})
const emit = defineEmits(['done'])

const { scene, line } = useTheme()
const progress = useProgress()
const s = scene(props.sceneKey)

const round = useRound(props.words)
const phase = ref('look') // look -> build -> check
const tiles = ref([])
const slots = ref([])
const result = ref(null) // null | 'right' | 'wrong'
const say = ref('')
const mood = ref('happy')

const word = computed(() => round.current.value)

// Extra letters that look like they could belong, so it isn't just unscrambling.
function decoys(text) {
  const pool = [...new Set(props.graphemes.join('').replace(/_/g, '') + 'aeiy')].filter((c) => !text.includes(c))
  const consonants = 'tnslpmdrk'.split('').filter((c) => !text.includes(c))
  return [...shuffle(pool).slice(0, 1), ...shuffle(consonants).slice(0, 1)]
}

function look() {
  phase.value = 'look'
  result.value = null
  mood.value = 'happy'
  say.value = s.prompt || GAME_LINES.spellItLook
  sayWord(word.value.text)
}

function cover() {
  const letters = [...word.value.text, ...decoys(word.value.text)]
  tiles.value = shuffle(letters).map((ch, id) => ({ id, ch, used: false }))
  slots.value = Array(word.value.text.length).fill(null)
  phase.value = 'build'
  mood.value = 'thinking'
  say.value = GAME_LINES.spellItBuild
  sayWord(word.value.text)
}

function place(tile) {
  if (tile.used || phase.value !== 'build') return
  const i = slots.value.indexOf(null)
  if (i === -1) return
  slots.value[i] = tile
  tile.used = true
  if (!slots.value.includes(null)) setTimeout(check, 250)
}

function unplace(i) {
  if (phase.value !== 'build' || !slots.value[i]) return
  slots.value[i].used = false
  slots.value[i] = null
}

// Wipe every letter so she can start the word again; it isn't a try, so nothing is recorded.
function clear() {
  if (phase.value !== 'build') return
  slots.value.forEach((t) => t && (t.used = false))
  slots.value = slots.value.map(() => null)
}

const anyPlaced = computed(() => slots.value.some(Boolean))

function check() {
  const attempt = slots.value.map((t) => t.ch).join('')
  const right = attempt === word.value.text
  phase.value = 'check'
  result.value = right ? 'right' : 'wrong'
  progress.recordAnswer(word.value.text, right)
  if (right) {
    mood.value = 'happy'
    say.value = line('correct', { word: word.value.text })
    setTimeout(() => advance(true), 1600)
  } else {
    mood.value = 'thinking'
    say.value = `${line('tryAgain')} ${GAME_LINES.spellItMissed}`
  }
}

function advance(right) {
  round.next(right)
  if (round.finished.value) emit('done')
  else look()
}

onMounted(look)
</script>

<template>
  <SceneFrame :background="s.background" :progress="round.progress.value" :item="s.item">
    <template v-if="word">
      <!-- Look -->
      <div v-if="phase === 'look'" class="look">
        <div :key="word.text" class="show panel pop"><MarkedWord :word="word" /></div>
        <div class="row">
          <SpeakButton :text="word.text" :size="80" />
          <button class="btn big" @click="cover">I've got it!</button>
        </div>
      </div>

      <!-- Build and check -->
      <div v-else class="build">
        <div class="slots" :class="{ shake: result === 'wrong' }">
          <button
            v-for="(t, i) in slots"
            :key="i"
            class="slot"
            :class="{
              filled: t,
              good: result && t && t.ch === word.text[i],
              bad: result === 'wrong' && t && t.ch !== word.text[i],
            }"
            @click="unplace(i)"
          >
            {{ t?.ch }}
          </button>
          <SpeakButton v-if="phase === 'build'" :text="word.text" />
        </div>

        <template v-if="phase === 'build'">
          <div class="tiles">
            <button v-for="t in tiles" :key="t.id" class="tile" :class="{ used: t.used }" @click="place(t)">
              {{ t.ch }}
            </button>
          </div>
          <button class="btn secondary clear" :disabled="!anyPlaced" @click="clear">
            <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true">
              <path
                d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            Clear
          </button>
        </template>

        <div v-else-if="result === 'wrong'" class="answer">
          <div class="show small panel"><MarkedWord :word="word" /></div>
          <button class="btn big" @click="advance(false)">OK!</button>
        </div>
      </div>
    </template>

    <template #character>
      <CharacterBubble :who="s.speaker" :mood="mood" :text="say" />
    </template>
  </SceneFrame>
</template>

<style scoped>
.look,
.build,
.answer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28px;
}
.row {
  display: flex;
  align-items: center;
  gap: 20px;
}
.show {
  font-size: 5rem;
  padding: 10px 56px;
}
.show.small {
  font-size: 3rem;
  padding: 6px 36px;
}
.slots {
  display: flex;
  align-items: center;
  gap: 10px;
}
.slot {
  width: 80px;
  height: 96px;
  border-radius: 16px;
  border: 4px dashed rgba(0, 0, 0, 0.25);
  background: rgba(255, 255, 255, 0.7);
  font-size: 3.2rem;
  font-weight: 700;
  color: var(--sq-surface-text);
}
.slot.filled {
  border-style: solid;
  border-color: var(--sq-tile-edge);
  background: var(--sq-tile);
}
.slot.good {
  border-color: var(--sq-good);
  background: #e7f7ea;
}
.slot.bad {
  border-color: var(--sq-bad);
  color: var(--sq-bad);
  background: #fde8e6;
}
.tiles {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 14px;
  max-width: 700px;
}
.tile {
  width: 84px;
  height: 84px;
  border-radius: 16px;
  background: var(--sq-tile);
  border: 3px solid var(--sq-tile-edge);
  box-shadow: 0 6px 0 var(--sq-tile-edge);
  font-size: 2.8rem;
  font-weight: 700;
  color: var(--sq-surface-text);
  transition: transform 0.1s, opacity 0.2s;
}
.tile:active {
  transform: translateY(4px);
  box-shadow: 0 2px 0 var(--sq-tile-edge);
}
.clear {
  min-width: 200px;
  font-size: 1.4rem;
}
.clear:disabled {
  opacity: 0.4;
}
.tile.used {
  opacity: 0.2;
  pointer-events: none;
}
@media (max-width: 640px) {
  .slot {
    width: 54px;
    height: 70px;
    font-size: 2.2rem;
  }
  .tile {
    width: 64px;
    height: 64px;
    font-size: 2.2rem;
  }
  .show {
    font-size: 3.4rem;
  }
}
</style>
