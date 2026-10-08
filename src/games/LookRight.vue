<script setup>
// Which Looks Right? Hear the word, then tap the one spelt right out of three.
// The wrong ones use the other spellings of the sound: sail / sayl / sale.
import { computed, onMounted, ref } from 'vue'
import SceneFrame from '../components/SceneFrame.vue'
import CharacterBubble from '../components/CharacterBubble.vue'
import SpeakButton from '../components/SpeakButton.vue'
import { useTheme } from '../composables/useTheme.js'
import { useRound } from '../composables/useRound.js'
import { sayWord } from '../composables/useSpeech.js'
import { lookalikes } from '../lib/words.js'
import { shuffle } from '../lib/queue.js'
import { useProgress } from '../stores/progress.js'
import { GAME_LINES } from '../lib/gameLines.js'

const props = defineProps({
  week: { type: Object, required: true },
  sceneKey: { type: String, default: 'lookRight' },
})
const emit = defineEmits(['done'])

const { scene, line } = useTheme()
const progress = useProgress()
const s = scene(props.sceneKey)

const round = useRound(props.week.words.filter((w) => w.pattern))
const say = ref(s.prompt || GAME_LINES.lookRightPrompt)
const mood = ref('happy')
const options = ref([])
const wrong = ref(new Set())
const solved = ref(false)
let busy = false

const word = computed(() => round.current.value)

function newWord() {
  const w = word.value
  if (!w) return
  wrong.value = new Set()
  solved.value = false
  options.value = shuffle([w.text, ...lookalikes(w, props.week.graphemes, { isWord: props.week.isWord })])
  sayWord(w.text)
}

function choose(text) {
  if (busy || solved.value || wrong.value.has(text)) return
  const w = word.value
  if (text === w.text) {
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
    wrong.value = new Set([...wrong.value, text])
    mood.value = 'thinking'
    say.value = props.week.tips[w.pattern] || line('tryAgain')
  }
}

onMounted(newWord)
</script>

<template>
  <SceneFrame :background="s.background" :progress="round.progress.value" :item="s.item">
    <div v-if="word" class="ask">
      <SpeakButton :text="word.text" :size="88" />
    </div>

    <div class="signs">
      <button
        v-for="o in options"
        :key="word?.text + o"
        class="sign panel pop"
        :class="{ used: wrong.has(o), right: solved && o === word.text, shake: wrong.has(o) }"
        :disabled="wrong.has(o)"
        @click="choose(o)"
      >
        {{ o }}
      </button>
    </div>

    <template #character>
      <CharacterBubble :who="s.speaker" :mood="mood" :text="say" />
    </template>
  </SceneFrame>
</template>

<style scoped>
.signs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 22px;
  width: min(100%, 860px);
}
.sign {
  min-height: 130px;
  font-size: 3.4rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  transition: transform 0.1s, opacity 0.2s;
}
.sign:active {
  transform: translateY(3px);
}
.sign.used {
  opacity: 0.35;
  text-decoration: line-through;
  text-decoration-color: var(--sq-bad);
}
.sign.right {
  background: var(--sq-good);
  color: #fff;
}
@media (max-width: 640px) {
  .sign {
    min-height: 100px;
    font-size: 2.6rem;
  }
}
</style>
