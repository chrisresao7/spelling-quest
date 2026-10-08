<script setup>
// One week's chapter: story pages between the games, a sticker at the end.
import { computed, ref, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import StoryCard from '../components/StoryCard.vue'
import SoundSort from '../games/SoundSort.vue'
import PickPatch from '../games/PickPatch.vue'
import SpellIt from '../games/SpellIt.vue'
import LookRight from '../games/LookRight.vue'
import TrickyCatch from '../games/TrickyCatch.vue'
import { loadDictionary, loadWeek } from '../composables/content.js'
import { useTheme } from '../composables/useTheme.js'
import { useProgress } from '../stores/progress.js'

const props = defineProps({ weekId: { type: String, required: true } })
const router = useRouter()
const { theme, scene, line, fill, asset } = useTheme()
const progress = useProgress()

const week = ref(null)
const error = ref(null)
const step = ref(0)
const playing = ref(false)
const sticker = ref(null)

watchEffect(async () => {
  try {
    const [w, dict] = await Promise.all([loadWeek(props.weekId), loadDictionary()])
    week.value = { ...w, isWord: (s) => dict.has(s) }
  } catch (e) {
    error.value = e.message
  }
})

// The order of the chapter. A theme only changes how each step looks and what it says.
const steps = computed(() => {
  if (!week.value) return []
  const s = ['intro', 'soundSort', 'pickPatch', 'lookRight', 'spellIt']
  if (week.value.tricky.length) s.push('tricky', 'trickyCatch')
  return [...s, 'end']
})
const key = computed(() => steps.value[step.value])
const story = computed(() => theme.value?.story || {})

function nextStep() {
  playing.value = false
  step.value++
  if (key.value === 'end') {
    progress.completeChapter(week.value.id)
    sticker.value = progress.awardSticker(theme.value.id, theme.value.rewards, week.value.id)
  }
}
</script>

<template>
  <p v-if="error" style="padding: 2rem">Couldn't open this chapter. ({{ error }})</p>
  <template v-else-if="week">
    <StoryCard
      v-if="key === 'intro'"
      :title="fill(story.title)"
      :text="fill(story.intro)"
      :speakers="['hero', 'sidekick']"
      :background="asset(story.background)"
      button="Start!"
      @next="nextStep"
    />

    <StoryCard
      v-else-if="key === 'end'"
      :title="fill(story.endTitle || 'Hooray!')"
      :text="fill(story.ending) || line('chapterEnd')"
      :speakers="['hero', 'sidekick']"
      :background="asset(story.endBackground || story.background)"
      button="Play again"
      @next="step = 0"
    >
      <div v-if="sticker" class="sticker-won">
        <img class="pop" :src="asset(sticker.art)" alt="Your new sticker" />
        <span>You won a sticker!</span>
      </div>
      <div class="end-links">
        <button class="btn secondary" @click="router.push('/stickers')">Sticker book</button>
        <button class="btn secondary" @click="router.push('/')">Home</button>
      </div>
    </StoryCard>

    <template v-else>
      <StoryCard
        v-if="!playing"
        :key="key + '-card'"
        :title="scene(key).title"
        :text="scene(key).intro"
        :speakers="[scene(key).speaker]"
        :background="scene(key).background"
        @next="playing = true"
      />
      <SoundSort v-else-if="key === 'soundSort'" :week="week" @done="nextStep" />
      <PickPatch v-else-if="key === 'pickPatch'" :week="week" @done="nextStep" />
      <LookRight v-else-if="key === 'lookRight'" :week="week" @done="nextStep" />
      <SpellIt
        v-else-if="key === 'spellIt'"
        :words="week.words"
        :graphemes="week.graphemes"
        scene-key="spellIt"
        @done="nextStep"
      />
      <SpellIt
        v-else-if="key === 'tricky'"
        :words="week.tricky"
        :graphemes="week.graphemes"
        scene-key="tricky"
        @done="nextStep"
      />
      <TrickyCatch v-else-if="key === 'trickyCatch'" :week="week" @done="nextStep" />
    </template>
  </template>
</template>

<style scoped>
.sticker-won {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  color: var(--sq-primary);
}
.sticker-won img {
  width: 150px;
  height: 150px;
}
.end-links {
  display: flex;
  gap: 14px;
}
</style>
