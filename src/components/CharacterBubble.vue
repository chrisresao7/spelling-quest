<script setup>
import { watch } from 'vue'
import { useTheme } from '../composables/useTheme.js'
import { speak } from '../composables/useSpeech.js'

// A theme character with a speech bubble. New lines are read aloud; tap the bubble to hear it again.
const props = defineProps({
  who: { type: String, default: 'hero' },
  mood: { type: String, default: 'happy' },
  text: { type: String, default: '' },
  say: { type: Boolean, default: true },
})

const { characterArt, characterName } = useTheme()

watch(
  () => props.text,
  (t) => {
    if (props.say && t) speak(t)
  },
  { immediate: true },
)
</script>

<template>
  <div class="character">
    <img :key="who + mood" class="pose pop" :src="characterArt(who, mood)" :alt="characterName(who)" />
    <Transition name="bubble" mode="out-in">
      <button v-if="text" :key="text" class="bubble panel" @click="speak(text)">
        <strong class="name">{{ characterName(who) }}</strong>
        <span>{{ text }}</span>
      </button>
    </Transition>
  </div>
</template>

<style scoped>
.character {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  min-height: 150px;
}
.pose {
  width: 150px;
  height: 150px;
  object-fit: contain;
  flex: none;
  filter: drop-shadow(0 4px 2px rgba(0, 0, 0, 0.15));
}
.bubble {
  position: relative;
  text-align: left;
  padding: 14px 20px;
  margin-bottom: 40px;
  font-size: 1.05rem;
  line-height: 1.35;
  max-width: 560px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.bubble::before {
  content: '';
  position: absolute;
  left: -14px;
  bottom: 18px;
  border: 10px solid transparent;
  border-right: 14px solid var(--sq-surface);
  border-left: 0;
}
.name {
  font-size: 0.8rem;
  color: var(--sq-primary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.bubble-enter-active,
.bubble-leave-active {
  transition: all 0.2s;
}
.bubble-enter-from,
.bubble-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
@media (max-width: 640px) {
  .pose {
    width: 100px;
    height: 100px;
  }
  .bubble {
    margin-bottom: 20px;
    font-size: 0.95rem;
  }
}
</style>
