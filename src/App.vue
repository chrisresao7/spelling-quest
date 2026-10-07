<script setup>
import { onMounted, ref, watch } from 'vue'
import { useProgress } from './stores/progress.js'
import { applyTheme } from './composables/useTheme.js'
import { loadThemeList } from './composables/content.js'

const progress = useProgress()
const ready = ref(false)
const error = ref(null)

async function useThemeFromSettings() {
  try {
    const { default: fallback, themes } = await loadThemeList()
    const id = themes.includes(progress.settings.theme) ? progress.settings.theme : fallback
    await applyTheme(id)
    ready.value = true
  } catch (e) {
    error.value = e.message
  }
}

onMounted(useThemeFromSettings)
watch(() => progress.settings.theme, useThemeFromSettings)
</script>

<template>
  <p v-if="error" class="error">Oops, something went wrong loading the game. ({{ error }})</p>
  <RouterView v-else-if="ready" />
</template>

<style scoped>
.error {
  padding: 2rem;
}
</style>
