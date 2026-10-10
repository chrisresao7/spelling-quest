<script setup>
// Write It: look at a word, cover it, then write it with a finger, one letter in each box,
// like writing spellings out on paper. Each letter is read (src/lib/handwriting.js); a letter
// that isn't right gets shown being written and another go. A right letter that was formed
// differently from the school way gets a gentle tip, never a wrong mark.
import { computed, onMounted, ref } from 'vue'
import SceneFrame from '../components/SceneFrame.vue'
import CharacterBubble from '../components/CharacterBubble.vue'
import SpeakButton from '../components/SpeakButton.vue'
import MarkedWord from '../components/MarkedWord.vue'
import LetterBox from '../components/LetterBox.vue'
import { useTheme } from '../composables/useTheme.js'
import { useRound } from '../composables/useRound.js'
import { sayWord } from '../composables/useSpeech.js'
import { letterSamples } from '../composables/useLetterSamples.js'
import { checkLetter } from '../lib/handwriting.js'
import { shuffle } from '../lib/queue.js'
import { useProgress } from '../stores/progress.js'
import { GAME_LINES } from '../lib/gameLines.js'

// Writing takes longer than tapping tiles, so a chapter writes a few of the week's words.
const WORDS_TO_WRITE = 4

const props = defineProps({
  week: { type: Object, required: true },
  sceneKey: { type: String, default: 'writeIt' },
})
const emit = defineEmits(['done'])

const { scene, line } = useTheme()
const progress = useProgress()
const s = scene(props.sceneKey)

const round = useRound(shuffle([...props.week.words, ...props.week.tricky]).slice(0, WORDS_TO_WRITE))
const phase = ref('look') // look -> write -> checking -> (fix -> checking) -> next | missed
const boxes = ref([])
const history = [] // which box each stroke went in, for rubbing out
const firstTry = ref(true)
const replay = ref(0)
const say = ref('')
const mood = ref('happy')

const word = computed(() => round.current.value)
const writing = computed(() => phase.value === 'write' || phase.value === 'fix')

const TIPS = {
  start: GAME_LINES.writeTipStart,
  way: GAME_LINES.writeTipWay,
  tall: GAME_LINES.writeTipTall,
  tail: GAME_LINES.writeTipTail,
  small: GAME_LINES.writeTipSmall,
}

function look() {
  phase.value = 'look'
  mood.value = 'happy'
  say.value = s.prompt || GAME_LINES.writeItLook
  sayWord(word.value.text)
}

function cover() {
  boxes.value = [...word.value.text].map((letter) => ({ letter, strokes: [], state: '', guide: null }))
  history.length = 0
  firstTry.value = true
  phase.value = 'write'
  mood.value = 'thinking'
  say.value = GAME_LINES.writeItWrite
  sayWord(word.value.text)
}

function addStroke(i, pts) {
  if (!writing.value) return
  boxes.value[i].strokes.push(pts)
  history.push(i)
}

function rubOut() {
  const i = history.pop()
  if (i !== undefined) boxes.value[i].strokes.pop()
}

const editable = (b) => writing.value && b.state !== 'good'

async function check() {
  const todo = boxes.value.filter((b) => b.state !== 'good')
  if (todo.some((b) => !b.strokes.length)) {
    say.value = GAME_LINES.writeItEmpty
    return
  }
  phase.value = 'checking'
  let tip = null
  for (const b of todo) {
    // One letter at a time, so the boxes light up as they're read and the tablet stays smooth.
    await new Promise((r) => setTimeout(r, 30))
    const res = checkLetter(b.strokes, b.letter, { extra: letterSamples })
    b.state = res.ok ? 'good' : 'bad'
    if (res.ok && res.tip && !tip) tip = { box: b, kind: res.tip }
  }

  const wrong = boxes.value.filter((b) => b.state === 'bad')
  if (!wrong.length) {
    progress.recordAnswer(word.value.text, firstTry.value)
    mood.value = 'happy'
    if (tip) {
      tip.box.state = 'tip'
      tip.box.guide = tip.box.letter
      replay.value++
      say.value = TIPS[tip.kind]
      phase.value = 'next'
    } else {
      say.value = line('correct', { word: word.value.text })
      phase.value = 'next'
      setTimeout(() => phase.value === 'next' && advance(), 1600)
    }
    return
  }

  mood.value = 'thinking'
  if (firstTry.value) {
    // Show how each wrong letter is written, then let her have another go at just those.
    firstTry.value = false
    for (const b of wrong) {
      b.strokes = []
      b.guide = b.letter
    }
    history.length = 0
    replay.value++
    say.value = GAME_LINES.writeItFix
    phase.value = 'fix'
  } else {
    progress.recordAnswer(word.value.text, false)
    say.value = GAME_LINES.writeItMissed
    phase.value = 'missed'
  }
}

function advance() {
  round.next(firstTry.value && phase.value === 'next')
  if (round.finished.value) emit('done')
  else look()
}

function showAgain() {
  replay.value++
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

      <!-- Write, check, fix -->
      <div v-else class="write">
        <div v-if="phase === 'missed'" class="show small panel pop"><MarkedWord :word="word" /></div>
        <div class="boxes" :style="{ '--n': boxes.length }">
          <LetterBox
            v-for="(b, i) in boxes"
            :key="i"
            :strokes="b.strokes"
            :state="b.state"
            :guide="b.guide"
            :replay="replay"
            :disabled="!editable(b)"
            :label="`Letter ${i + 1} of ${boxes.length}`"
            :data-letter="b.letter"
            @stroke="addStroke(i, $event)"
          />
        </div>

        <div class="row">
          <template v-if="writing">
            <SpeakButton :text="word.text" />
            <button class="btn secondary" @click="rubOut">Rub out</button>
            <button v-if="phase === 'fix'" class="btn secondary" @click="showAgain">Show me</button>
            <button class="btn big" @click="check">Check</button>
          </template>
          <p v-else-if="phase === 'checking'" class="reading">Reading your writing…</p>
          <template v-else-if="phase === 'next' && boxes.some((b) => b.state === 'tip')">
            <button class="btn secondary" @click="showAgain">Show me</button>
            <button class="btn big" @click="advance">Next</button>
          </template>
          <button v-else-if="phase === 'missed'" class="btn big" @click="advance">OK!</button>
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
.write {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  width: 100%;
}
.row {
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 72px;
}
.show {
  font-size: 5rem;
  padding: 10px 56px;
}
.show.small {
  font-size: 2.4rem;
  padding: 4px 30px;
}
.boxes {
  display: grid;
  grid-template-columns: repeat(var(--n), minmax(0, min(120px, 20dvh)));
  justify-content: center;
  gap: 10px;
  width: 100%;
}
.reading {
  margin: 0;
  font-weight: 700;
  color: var(--sq-primary);
}
@media (max-width: 640px) {
  .show {
    font-size: 3.4rem;
  }
  .boxes {
    gap: 6px;
  }
}
</style>
