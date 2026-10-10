<script setup>
// Fills the whole screen with the game, hiding the browser's address bar (Silk on the
// Fire tablet, Chrome, Safari on iPad). Browsers only allow this from a tap, so it's a
// button. It hides itself where the browser can't do it, and when the game was opened
// from a home-screen icon that already fills the screen (manifest.webmanifest).
import { onBeforeUnmount, onMounted, ref } from 'vue'

const root = document.documentElement
const enter = root.requestFullscreen || root.webkitRequestFullscreen
const leave = document.exitFullscreen || document.webkitExitFullscreen
const supported = !!enter && !!(document.fullscreenEnabled ?? document.webkitFullscreenEnabled)
const launchedFull = window.matchMedia?.('(display-mode: fullscreen)').matches && !current()

const isFull = ref(!!current())

function current() {
  return document.fullscreenElement || document.webkitFullscreenElement
}
function sync() {
  isFull.value = !!current()
}
async function toggle() {
  try {
    if (current()) await leave.call(document)
    else await enter.call(root)
  } catch {
    // Refused (for example a kids' browser that doesn't allow it). Nothing to do.
  }
  sync()
}

onMounted(() => {
  document.addEventListener('fullscreenchange', sync)
  document.addEventListener('webkitfullscreenchange', sync)
})
onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', sync)
  document.removeEventListener('webkitfullscreenchange', sync)
})
</script>

<template>
  <button v-if="supported && !launchedFull" type="button" class="btn secondary" @click="toggle">
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <path
        v-if="!isFull"
        d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"
        fill="none"
        stroke="currentColor"
        stroke-width="2.6"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        v-else
        d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5"
        fill="none"
        stroke="currentColor"
        stroke-width="2.6"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
    {{ isFull ? 'Small screen' : 'Big screen' }}
  </button>
</template>
