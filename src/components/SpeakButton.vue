<script setup>
import { canSpeak, speak } from '../composables/useSpeech.js'

const props = defineProps({
  text: { type: String, required: true },
  size: { type: Number, default: 72 },
})
</script>

<template>
  <button
    v-if="canSpeak"
    class="speak"
    :style="{ width: `${size}px`, height: `${size}px` }"
    aria-label="Hear it again"
    @click="speak(props.text, { slow: true })"
  >
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
      <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" />
    </svg>
  </button>
</template>

<style scoped>
.speak {
  border-radius: 50%;
  background: var(--sq-accent);
  color: #fff;
  box-shadow: var(--sq-shadow);
  display: grid;
  place-items: center;
  flex: none;
}
.speak svg {
  width: 55%;
  height: 55%;
}
.speak:active {
  transform: translateY(3px);
}
</style>
