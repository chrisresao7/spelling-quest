<script setup>
// Pick the Patch: hear the word, see it with the sound missing, pick the right spelling.
import { computed, onMounted, ref } from 'vue'
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
  sceneKey: { type: String, default: 'pickPatch' },
})
const emit = defineEmits(['done'])

const { scene, line } = useTheme()
const progress = useProgress()
const s = scene(props.sceneKey)

const round = useRound(props.week.words.filter((w) => w.pattern))
const say = ref(s.prompt || 'Listen, then pick the missing letters!')
const mood = ref('happy')
const wrong = ref(new Set())
const solved = ref(false)
let busy = false

const word = computed(() => round.current.value)

function newWord() {
  wrong.value = new Set()
  solved.value = false
  if (word.value) sayWord(word.value.text)
}

function choose(g) {
  if (busy || solved.value || wrong.value.has(g)) return
  const w = word.value
  if (g === w.pattern) {
    busy = true
    solved.value = true
    const firstTry = wrong.value.size === 0
    progress.recordAnswer(w.text, firstTry)
    mood.value = 'happy'
    say.value = line('correct', { word: w.text })
    setTimeout(() => {
      round.next(firstTry)
      busy = false
      if (round.finished.value) emit('done')
      else newWord()
    }, 1500)
  } else {
    wrong.value = new Set([...wrong.value, g])
    mood.value = 'thinking'
    // The teacher's tip for the right spelling is the most useful nudge.
    say.value = props.week.tips[w.pattern] || line('tryAgain')
  }
}

onMounted(newWord)
</script>

<template>
  <SceneFrame :background="s.background" :progress="round.progress.value" :item="s.item">
    <div v-if="word" class="puzzle">
      <div :key="word.text" class="flag panel pop">
        <MarkedWord v-if="solved" :word="word" />
        <template v-else>
          <span>{{ word.prefix }}</span><span class="gap">?</span><span>{{ word.middle }}{{ word.suffix }}</span>
        </template>
      </div>
      <SpeakButton :text="word.text" />
    </div>

    <div class="choices">
      <button
        v-for="g in week.graphemes"
        :key="g"
        class="choice"
        :class="{ used: wrong.has(g), right: solved && g === word?.pattern }"
        :disabled="wrong.has(g)"
        @click="choose(g)"
      >
        {{ graphemeLabel(g) }}
      </button>
    </div>

    <template #character>
      <CharacterBubble :who="s.speaker" :mood="mood" :text="say" />
    </template>
  </SceneFrame>
</template>

<style scoped>
.puzzle {
  display: flex;
  align-items: center;
  gap: 20px;
}
.flag {
  font-size: 4rem;
  font-weight: 700;
  padding: 10px 44px;
  letter-spacing: 0.06em;
  min-width: 300px;
  text-align: center;
}
.gap {
  display: inline-block;
  min-width: 1.6em;
  margin: 0 0.1em;
  border-bottom: 6px dashed var(--sq-focus);
  color: var(--sq-muted);
  text-align: center;
}
.choices {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 18px;
  width: min(100%, 760px);
}
.choice {
  min-height: 110px;
  border-radius: var(--sq-radius);
  background: var(--sq-surface);
  color: var(--sq-focus);
  font-size: 3rem;
  font-weight: 700;
  box-shadow: var(--sq-shadow);
  transition: transform 0.1s, opacity 0.2s;
}
.choice:active {
  transform: translateY(3px);
}
.choice.used {
  opacity: 0.35;
  text-decoration: line-through;
}
.choice.right {
  background: var(--sq-good);
  color: #fff;
}
</style>
