import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'
import ChapterView from './views/ChapterView.vue'
import StickersView from './views/StickersView.vue'

// Hash URLs (#/chapter/...) work on any static host with no extra set-up.
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/chapter/:weekId', name: 'chapter', component: ChapterView, props: true },
    { path: '/stickers', name: 'stickers', component: StickersView },
  ],
})
