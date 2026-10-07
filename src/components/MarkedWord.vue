<script setup>
// Shows a word with the letters for this week's sound coloured in, like the school sheet.
defineProps({
  word: { type: Object, required: true },
  highlight: { type: Boolean, default: true },
})
</script>

<template>
  <span class="word" :aria-label="word.text">
    <span v-for="(p, i) in word.parts" :key="i" :class="{ focus: highlight && p.focus }">{{ p.t }}</span>
  </span>
</template>

<style scoped>
.word {
  font-weight: 700;
  letter-spacing: 0.04em;
}
</style>
