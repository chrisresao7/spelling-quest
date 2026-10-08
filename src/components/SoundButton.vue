<script setup>
// Plays a grown-up's recording of the week's sound. Only shown once there is one,
// because a computer voice can't be trusted to say a sound on its own.
import { computed } from 'vue'
import { recordings } from '../composables/useRecordings.js'
import { speak } from '../composables/useSpeech.js'

const props = defineProps({ sound: { type: String, required: true } })
const recorded = computed(() => !!recordings[`sound:${props.sound}`])
</script>

<template>
  <button v-if="recorded" class="sound-btn" aria-label="Hear the sound" @click="speak(sound, { role: 'sound' })">
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
      <path d="M16 8.5a5 5 0 0 1 0 7" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" />
    </svg>
    <span>/{{ sound }}/</span>
  </button>
</template>

<style scoped>
.sound-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  border-radius: 999px;
  background: var(--sq-surface);
  color: var(--sq-focus);
  font-size: 1.4rem;
  font-weight: 700;
  box-shadow: var(--sq-shadow);
}
.sound-btn svg {
  width: 1.4em;
  height: 1.4em;
}
.sound-btn:active {
  transform: translateY(3px);
}
</style>
