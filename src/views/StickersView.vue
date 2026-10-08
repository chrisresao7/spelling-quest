<script setup>
// The sticker book: one page per theme. Stickers still to win show as shadows to collect.
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { loadThemeConfig } from '../composables/content.js'
import { useTheme } from '../composables/useTheme.js'
import { speak, stopSpeaking } from '../composables/useSpeech.js'
import { useProgress } from '../stores/progress.js'

const { theme, asset } = useTheme()
const progress = useProgress()
const others = ref([])
const popped = ref(null)

// "art/sticker-crab.svg" -> "crab"
const nameOf = (art) => art.split('/').pop().replace(/\.\w+$/, '').replace(/^sticker-/, '').replace(/-/g, ' ')

function countOf(themeId, art) {
  return progress.stickers.filter((s) => s.theme === themeId && s.art === art).length
}

const page = computed(() =>
  (theme.value.rewards || []).map((art) => ({ art, count: countOf(theme.value.id, art) })),
)
const owned = computed(() => page.value.filter((s) => s.count > 0).length)

// Stickers won with themes that aren't switched on now still belong in the book.
onMounted(async () => {
  const ids = [...new Set(progress.stickers.map((s) => s.theme))].filter((id) => id !== theme.value.id)
  const configs = await Promise.all(ids.map((id) => loadThemeConfig(id).catch(() => null)))
  others.value = configs.filter(Boolean).map((t) => ({
    id: t.id,
    name: t.name,
    stickers: [...new Set(progress.stickers.filter((s) => s.theme === t.id).map((s) => s.art))].map((art) => ({
      art,
      src: `${t.root}${art}`,
    })),
  }))
})

function tap(s) {
  if (!s.count) return speak('Play a chapter to win this sticker!')
  popped.value = s.art
  speak(nameOf(s.art))
}
</script>

<template>
  <div class="book" :style="theme.home?.background ? { backgroundImage: `url(${asset(theme.home.background)})` } : null">
    <header class="top">
      <RouterLink to="/" class="home panel" aria-label="Home" @click="stopSpeaking()">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11l9-8 9 8v10h-6v-6H9v6H3z" fill="currentColor" /></svg>
      </RouterLink>
    </header>

    <section class="page panel">
      <h1>My sticker book</h1>
      <p class="count">{{ owned }} of {{ page.length }} {{ theme.name }} stickers</p>
      <div class="grid">
        <button
          v-for="(s, i) in page"
          :key="s.art"
          class="slot"
          :class="{ have: s.count, pop: popped === s.art }"
          :style="{ '--tilt': `${((i * 7) % 11) - 5}deg` }"
          :aria-label="s.count ? nameOf(s.art) : 'Sticker still to win'"
          @click="tap(s)"
          @animationend="popped = null"
        >
          <img :src="asset(s.art)" alt="" />
          <span v-if="s.count > 1" class="times">×{{ s.count }}</span>
        </button>
      </div>
      <p v-if="!owned" class="hint">Finish a chapter to win your first sticker!</p>
    </section>

    <section v-for="o in others" :key="o.id" class="page panel">
      <h2>{{ o.name }}</h2>
      <div class="grid">
        <div v-for="(s, i) in o.stickers" :key="s.art" class="slot have" :style="{ '--tilt': `${((i * 7) % 11) - 5}deg` }">
          <img :src="s.src" :alt="nameOf(s.art)" />
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.book {
  min-height: 100dvh;
  padding: max(16px, env(safe-area-inset-top)) 20px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  background-size: cover;
  background-position: center bottom;
  background-attachment: fixed;
}
.top {
  align-self: stretch;
}
.home {
  width: 60px;
  height: 60px;
  display: grid;
  place-items: center;
  color: var(--sq-primary);
}
.home svg {
  width: 32px;
}
.page {
  width: min(100%, 820px);
  padding: 24px 28px 32px;
  text-align: center;
}
h1,
h2 {
  margin: 0;
  color: var(--sq-primary);
}
h1 {
  font-size: 2.4rem;
}
.count {
  margin: 4px 0 20px;
  color: var(--sq-muted);
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 22px;
  justify-items: center;
}
.slot {
  position: relative;
  width: 150px;
  height: 150px;
  border-radius: 50%;
  border: 4px dashed color-mix(in srgb, var(--sq-muted) 40%, transparent);
  display: grid;
  place-items: center;
}
.slot img {
  width: 100%;
  height: 100%;
  /* A shadow of the sticker still to win. */
  filter: grayscale(1) brightness(0.4);
  opacity: 0.18;
}
.slot.have {
  border: none;
  transform: rotate(var(--tilt));
}
.slot.have img {
  filter: drop-shadow(0 5px 3px rgba(0, 0, 0, 0.2));
  opacity: 1;
}
.slot.have.pop {
  animation: sq-pop 0.35s ease-out;
}
.times {
  position: absolute;
  right: 4px;
  bottom: 4px;
  background: var(--sq-accent);
  color: #fff;
  font-weight: 700;
  font-size: 1rem;
  border-radius: 999px;
  padding: 2px 10px;
}
.hint {
  margin: 20px 0 0;
  font-size: 1.1rem;
}
@media (max-width: 640px) {
  .grid {
    grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  }
  .slot {
    width: 110px;
    height: 110px;
  }
}
</style>
