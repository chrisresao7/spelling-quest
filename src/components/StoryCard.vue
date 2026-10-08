<script setup>
// A page of the story between games: big character, a few lines, one button.
import { onMounted } from 'vue'
import { useTheme } from '../composables/useTheme.js'
import { speak } from '../composables/useSpeech.js'

const props = defineProps({
  title: { type: String, default: '' },
  text: { type: String, default: '' },
  speakers: { type: Array, default: () => ['hero'] },
  mood: { type: String, default: 'happy' },
  background: { type: String, default: null },
  button: { type: String, default: 'Let’s go!' },
})
const emit = defineEmits(['next'])
const { characterArt, characterName } = useTheme()

onMounted(() => speak([props.title, props.text]))
</script>

<template>
  <div class="story" :style="background ? { backgroundImage: `url(${background})` } : null">
    <div class="page panel pop">
      <h1 v-if="title">{{ title }}</h1>
      <p class="text" @click="speak(text)">{{ text }}</p>
      <slot />
      <button class="btn big" @click="emit('next')">{{ button }}</button>
    </div>
    <div class="cast">
      <img v-for="who in speakers" :key="who" class="pose" :src="characterArt(who, mood)" :alt="characterName(who)" />
    </div>
  </div>
</template>

<style scoped>
.story {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: max(28px, env(safe-area-inset-top)) 20px max(16px, env(safe-area-inset-bottom));
  background-size: cover;
  background-position: center bottom;
}
.page {
  width: min(100%, 720px);
  padding: 28px 36px 32px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
}
h1 {
  margin: 0;
  font-size: 2.2rem;
  color: var(--sq-primary);
}
.text {
  margin: 0;
  font-size: 1.35rem;
  line-height: 1.45;
}
.cast {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}
.pose {
  width: min(32vw, 240px);
  filter: drop-shadow(0 6px 3px rgba(0, 0, 0, 0.18));
}
</style>
