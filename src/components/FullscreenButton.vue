<script setup>
// Big screen / Small screen. Hidden where the browser can't go full screen, and when the game
// was opened from a home-screen icon that already fills the screen. See useFullscreen.js.
import { useFullscreen } from '../composables/useFullscreen.js'

const { supported, launchedFull, isFull, toggle } = useFullscreen()
</script>

<template>
  <button v-if="supported && !launchedFull" type="button" class="btn secondary" @click="toggle">
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <path
        :d="isFull ? 'M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5' : 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5'"
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
