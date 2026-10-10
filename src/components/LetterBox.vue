<script setup>
// One box on handwriting paper to write a letter in with a finger. The parent keeps the
// strokes; this box draws them, records new ones and can show how a letter is written.
import { computed, ref } from 'vue'
import { BOX, LINES, letterGuide } from '../lib/handwriting.js'

const props = defineProps({
  strokes: { type: Array, default: () => [] },
  /** '' | 'good' | 'tip' (right, with a tip on how it's formed) | 'bad' */
  state: { type: String, default: '' },
  /** A letter to show how to write: drawn faintly, then traced from the green dot. */
  guide: { type: String, default: null },
  /** Change this to play the guide again. */
  replay: { type: Number, default: 0 },
  disabled: { type: Boolean, default: false },
  label: { type: String, default: 'Letter box' },
})
const emit = defineEmits(['stroke'])

const svg = ref(null)
const live = ref([])
let pointer = null

const toPath = (pts) =>
  pts.length ? `M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L')}${pts.length === 1 ? 'Z' : ''}` : ''

const guideStrokes = computed(() => (props.guide ? letterGuide(props.guide) || [] : []))

function at(e) {
  const r = svg.value.getBoundingClientRect()
  return [((e.clientX - r.left) * BOX.width) / r.width, ((e.clientY - r.top) * BOX.height) / r.height]
}

function down(e) {
  if (props.disabled || pointer !== null) return
  pointer = e.pointerId
  svg.value.setPointerCapture?.(e.pointerId)
  live.value = [at(e)]
  e.preventDefault()
}

function move(e) {
  if (e.pointerId !== pointer) return
  const events = e.getCoalescedEvents?.() || []
  for (const ev of events.length ? events : [e]) {
    const p = at(ev)
    const last = live.value[live.value.length - 1]
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) >= 0.8) live.value.push(p)
  }
}

function up(e) {
  if (e.pointerId !== pointer) return
  pointer = null
  const pts = live.value.length === 1 ? [live.value[0], live.value[0]] : live.value
  live.value = []
  emit('stroke', pts.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]))
}
</script>

<template>
  <svg
    ref="svg"
    class="box"
    :class="[state, { disabled }]"
    :viewBox="`0 0 ${BOX.width} ${BOX.height}`"
    role="img"
    :aria-label="label"
    @pointerdown="down"
    @pointermove="move"
    @pointerup="up"
    @pointercancel="up"
  >
    <line class="rule faint" x1="4" x2="96" :y1="LINES.top" :y2="LINES.top" />
    <line class="rule dotted" x1="4" x2="96" :y1="LINES.mid" :y2="LINES.mid" />
    <line class="rule base" x1="4" x2="96" :y1="LINES.base" :y2="LINES.base" />
    <line class="rule faint" x1="4" x2="96" :y1="LINES.tail" :y2="LINES.tail" />

    <g v-if="guide" :key="`${guide}-${replay}`" class="guide">
      <path v-for="(s, i) in guideStrokes" :key="'g' + i" class="ghost" :d="toPath(s)" />
      <path
        v-for="(s, i) in guideStrokes"
        :key="'t' + i"
        class="trace"
        :d="toPath(s)"
        pathLength="1"
        :style="{ animationDelay: `${0.4 + i * 1.3}s` }"
      />
      <circle
        v-for="(s, i) in guideStrokes"
        :key="'d' + i"
        class="start"
        :class="{ first: i === 0 }"
        :cx="s[0][0]"
        :cy="s[0][1]"
        :r="i === 0 ? 5 : 3.5"
      />
    </g>

    <path v-for="(s, i) in strokes" :key="i" class="ink" :d="toPath(s)" />
    <path v-if="live.length" class="ink" :d="toPath(live)" />
  </svg>
</template>

<style scoped>
.box {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 100 / 150;
  background: rgba(255, 255, 255, 0.92);
  border: 4px solid var(--sq-tile-edge);
  border-radius: 16px;
  box-shadow: var(--sq-shadow);
  touch-action: none;
  transition: border-color 0.2s, background 0.2s;
}
.box.good {
  border-color: var(--sq-good);
  background: #eef9f0;
}
.box.tip {
  border-color: var(--sq-accent);
  background: #fff6e6;
}
.box.bad {
  border-color: var(--sq-bad);
  background: #fdeeed;
}
.rule {
  stroke: #9aa3c0;
  stroke-width: 0.8;
}
.rule.faint {
  opacity: 0.45;
}
.rule.dotted {
  stroke-dasharray: 2 3;
}
.rule.base {
  stroke-width: 1.4;
  stroke: #6f7aa0;
}
.ink {
  fill: none;
  stroke: var(--sq-surface-text);
  stroke-width: 5;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.ghost {
  fill: none;
  stroke: #c3c8da;
  stroke-width: 6;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 0.1 7;
}
.trace {
  fill: none;
  stroke: var(--sq-good);
  stroke-width: 5;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  opacity: 0.8;
  animation: sq-trace 1.2s ease-in-out forwards;
}
.start {
  fill: var(--sq-good);
  opacity: 0.7;
}
.start.first {
  opacity: 1;
  animation: sq-pulse 1s ease-in-out infinite alternate;
}
@keyframes sq-trace {
  to {
    stroke-dashoffset: 0;
  }
}
@keyframes sq-pulse {
  to {
    r: 6.5;
  }
}
</style>
