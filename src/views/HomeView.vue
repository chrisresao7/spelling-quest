<script setup>
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { loadThemeList, loadThemeConfig, loadWeekList } from '../composables/content.js'
import { useTheme } from '../composables/useTheme.js'
import { useProgress } from '../stores/progress.js'

const { theme, characterArt, asset } = useTheme()
const progress = useProgress()
const weeks = ref([])
const themes = ref([])

onMounted(async () => {
  weeks.value = await loadWeekList()
  const list = await loadThemeList()
  themes.value = await Promise.all(list.themes.map(loadThemeConfig))
})

function weekDate(id) {
  return new Date(`${id}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
}
</script>

<template>
  <div class="home" :style="theme.home?.background ? { backgroundImage: `url(${asset(theme.home.background)})` } : null">
    <header class="title panel">
      <img class="pose" :src="characterArt('hero', 'happy')" alt="" />
      <div>
        <h1>Spelling Quest</h1>
        <p>{{ theme.name }}</p>
      </div>
      <img class="pose flip" :src="characterArt('sidekick', 'happy')" alt="" />
    </header>

    <section>
      <h2>Pick a chapter</h2>
      <div class="chapters">
        <RouterLink
          v-for="(w, i) in weeks"
          :key="w.id"
          :to="`/chapter/${w.id}`"
          class="chapter panel"
          :class="{ newest: i === 0 }"
        >
          <span class="date">Week of {{ weekDate(w.id) }}</span>
          <strong>{{ w.title }}</strong>
          <span class="words">{{ w.words.map((x) => x.text).join(', ') }}</span>
          <span v-if="progress.chapters[w.id]" class="done">⭐ Played {{ progress.chapters[w.id].plays }}×</span>
        </RouterLink>
      </div>
    </section>

    <section class="row">
      <RouterLink to="/stickers" class="btn">My stickers ({{ progress.stickers.length }})</RouterLink>
      <label v-if="themes.length > 1" class="theme-pick panel">
        Theme
        <select v-model="progress.settings.theme">
          <option v-for="t in themes" :key="t.id" :value="t.id">{{ t.name }}</option>
        </select>
      </label>
    </section>
  </div>
</template>

<style scoped>
.home {
  min-height: 100dvh;
  padding: max(24px, env(safe-area-inset-top)) 24px 32px;
  display: flex;
  flex-direction: column;
  gap: 28px;
  align-items: center;
  background-size: cover;
  background-position: center bottom;
}
.title {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 24px;
  text-align: center;
}
.title h1 {
  margin: 0;
  font-size: 2.6rem;
  color: var(--sq-primary);
}
.title p {
  margin: 0;
  color: var(--sq-muted);
}
.pose {
  width: 110px;
  height: 110px;
}
.flip {
  transform: scaleX(-1);
}
section {
  width: min(100%, 860px);
}
h2 {
  margin: 0 0 12px;
  text-shadow: 0 2px 0 rgba(255, 255, 255, 0.6);
}
.chapters {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 18px;
}
.chapter {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 20px 24px;
  text-decoration: none;
  min-height: 140px;
}
.chapter.newest {
  outline: 5px solid var(--sq-accent);
}
.date {
  color: var(--sq-muted);
  font-size: 0.9rem;
}
.chapter strong {
  font-size: 1.4rem;
  color: var(--sq-primary);
}
.words {
  font-size: 1rem;
}
.done {
  font-size: 0.9rem;
  color: var(--sq-good);
  font-weight: 700;
}
.row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  align-items: center;
}
.row .btn {
  text-decoration: none;
}
.theme-pick {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 10px 18px;
}
select {
  font: inherit;
  padding: 6px 10px;
  border-radius: 10px;
}
</style>
