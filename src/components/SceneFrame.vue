<script setup>
// The screen around every scene: themed background, a home button, a progress trail
// and the character at the bottom.
import { RouterLink } from 'vue-router'
import { stopSpeaking } from '../composables/useSpeech.js'

defineProps({
  background: { type: String, default: null },
  progress: { type: Number, default: null },
  item: { type: String, default: null },
})
</script>

<template>
  <div class="frame" :style="background ? { backgroundImage: `url(${background})` } : null">
    <header class="top">
      <RouterLink to="/" class="home panel" aria-label="Home" @click="stopSpeaking()">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11l9-8 9 8v10h-6v-6H9v6H3z" fill="currentColor" /></svg>
      </RouterLink>
      <div v-if="progress !== null" class="trail panel" role="progressbar" :aria-valuenow="Math.round(progress * 100)">
        <div class="fill" :style="{ width: `${Math.max(progress, 0.04) * 100}%` }"></div>
        <img v-if="item" class="runner" :src="item" alt="" :style="{ left: `calc(${progress * 100}% - 24px)` }" />
      </div>
    </header>
    <main class="stage">
      <slot />
    </main>
    <footer class="cast">
      <slot name="character" />
    </footer>
  </div>
</template>

<style scoped>
.frame {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background-size: cover;
  background-position: center bottom;
  padding: max(16px, env(safe-area-inset-top)) 20px max(12px, env(safe-area-inset-bottom));
}
.top {
  display: flex;
  align-items: center;
  gap: 16px;
}
.home {
  width: 60px;
  height: 60px;
  display: grid;
  place-items: center;
  color: var(--sq-primary);
  flex: none;
}
.home svg {
  width: 32px;
}
.trail {
  position: relative;
  flex: 1;
  height: 22px;
  overflow: visible;
  padding: 4px;
}
.fill {
  height: 100%;
  border-radius: 999px;
  background: var(--sq-good);
  transition: width 0.5s ease;
}
.runner {
  position: absolute;
  top: -14px;
  width: 48px;
  height: 48px;
  transition: left 0.5s ease;
}
.stage {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 16px 0;
}
.cast {
  min-height: 150px;
}
</style>
