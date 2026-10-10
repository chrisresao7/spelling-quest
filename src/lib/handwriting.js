// Reading a handwritten letter, for the writing game (src/games/WriteIt.vue).
//
// A letter is drawn in a box with four writing lines, like handwriting paper. Each stroke is
// a list of [x, y] points in the box's own units: 100 wide and 150 tall, with
//   top line 20 (tall letters reach it), dotted line 60 (small letters reach it),
//   base line 100 (everything sits on it), tail line 135 (tails reach it).
//
// Two checks, kept apart on purpose:
//   1. Which letter is it? The $P point-cloud recogniser (Vatanavalarin, Anthony & Wobbrock,
//      "Gestures as Point Clouds", ICMI 2012) compares the drawing's shape with a model of each
//      lowercase letter. It ignores how the letter was drawn, so it is fair to a child whose
//      strokes are in a muddle. The game already knows which letter belongs in the box, so it
//      only has to decide whether that letter fits at least as well as any other.
//   2. How was it formed? Using the raw strokes: where she started, which way she went, and
//      whether it sits on the lines. These only ever give a tip; they never make a letter wrong.
//
// Letter models follow common UK primary (print) formation: small letters start at the dotted
// line, tall letters at the top line, round letters (a c d e g o q) go anticlockwise.

export const LINES = { top: 20, mid: 60, base: 100, tail: 135 }
export const BOX = { width: 100, height: 150 }

// ---- Letter models ----

const line = (...pts) => pts
function arc(cx, cy, rx, ry, from, to) {
  // Angles in degrees, 0 = right, 90 = down. Going from a bigger angle to a smaller one is
  // anticlockwise on screen.
  const steps = Math.max(2, Math.ceil(Math.abs(to - from) / 6))
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = ((from + ((to - from) * i) / steps) * Math.PI) / 180
    return [cx + rx * Math.cos(t), cy + ry * Math.sin(t)]
  })
}
const dot = (x, y) => [
  [x, y],
  [x, y],
]
// A stroke is made of pieces drawn one after another without lifting.
const stroke = (...pieces) => pieces.flat()

const bowlA = () => arc(50, 80, 17, 20, -30, -390) // round anticlockwise from the top right, like c
const TALL = new Set('bdfhklt')
const TAIL = new Set('gjpqy')

/** Each letter: one or more ways of writing it, each a list of strokes in the order they're made. */
export const LETTERS = {
  a: [[stroke(bowlA(), line([67, 60], [67, 100]))]],
  b: [[stroke(line([33, 20], [33, 100], [33, 82]), arc(50, 80, 17, 20, 180, 540))]],
  c: [[arc(50, 80, 17, 20, -40, -320)]],
  d: [[stroke(bowlA(), line([67, 20], [67, 100]))]],
  e: [[stroke(line([33, 80], [67, 80]), arc(50, 80, 17, 20, 0, -300))]],
  f: [[stroke(arc(57, 34, 11, 12, -20, -180), line([46, 34], [46, 100])), line([33, 60], [62, 60])]],
  g: [[stroke(bowlA(), line([67, 60], [67, 122]), arc(53, 122, 14, 13, 0, 160))]],
  h: [[stroke(line([33, 20], [33, 100], [33, 84]), arc(50, 82, 17, 18, 180, 360), line([67, 82], [67, 100]))]],
  i: [[line([50, 60], [50, 100]), dot(50, 44)]],
  j: [[stroke(line([55, 60], [55, 122]), arc(41, 122, 14, 13, 0, 160)), dot(55, 44)]],
  k: [[line([33, 20], [33, 100]), line([63, 58], [34, 82], [65, 100])]],
  l: [[line([50, 20], [50, 100])]],
  m: [
    [
      stroke(
        line([25, 60], [25, 100], [25, 76]),
        arc(37.5, 76, 12.5, 14, 180, 360),
        line([50, 76], [50, 100], [50, 76]),
        arc(62.5, 76, 12.5, 14, 180, 360),
        line([75, 76], [75, 100]),
      ),
    ],
  ],
  n: [[stroke(line([33, 60], [33, 100], [33, 80]), arc(50, 80, 17, 18, 180, 360), line([67, 80], [67, 100]))]],
  o: [[arc(50, 80, 18, 20, -80, -440)]],
  p: [[stroke(line([33, 60], [33, 135], [33, 80]), arc(50, 80, 17, 20, 180, 540))]],
  q: [[stroke(bowlA(), line([67, 60], [67, 135]))]],
  r: [[stroke(line([35, 60], [35, 100], [35, 80]), arc(51, 80, 16, 16, 180, 305))]],
  s: [[stroke(arc(50, 70, 15, 10, -20, -270), arc(50, 90, 15, 10, -90, 160))]],
  t: [[stroke(line([45, 35], [45, 93]), arc(53, 93, 8, 7, 180, 90)), line([33, 60], [60, 60])]],
  u: [[stroke(line([33, 60], [33, 82]), arc(50, 82, 17, 18, 180, 0), line([67, 82], [67, 60], [67, 100]))]],
  v: [[line([30, 60], [50, 100], [70, 60])]],
  w: [[line([22, 60], [35, 100], [50, 68], [65, 100], [78, 60])]],
  x: [[line([33, 60], [67, 100]), line([67, 60], [33, 100])]],
  y: [
    [line([33, 60], [50, 100]), line([67, 60], [40, 135])],
    [
      stroke(
        line([33, 60], [33, 82]),
        arc(50, 82, 17, 18, 180, 0),
        line([67, 82], [67, 60], [67, 122]),
        arc(53, 122, 14, 13, 0, 160),
      ),
    ],
  ],
  z: [[line([33, 60], [67, 60], [33, 100], [67, 100])]],
}

// Letters that go round anticlockwise first, the way school teaches round letters.
const ANTICLOCKWISE = new Set('acdegoq')

/** How a letter sits on the lines: 'tall' (reaches the top line), 'tail' (hangs below) or 'small'. */
export const heightOf = (letter) => (TALL.has(letter) ? 'tall' : TAIL.has(letter) ? 'tail' : 'small')

/** The model strokes of a letter, for showing how it's written. */
export const letterGuide = (letter) => LETTERS[letter]?.[0] ?? null

// ---- Geometry ----

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])
const pathLength = (pts) => pts.reduce((n, p, i) => (i ? n + dist(pts[i - 1], p) : 0), 0)

function bounds(points) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const [x, y] of points) {
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY }
}

/** k points spaced evenly along one stroke. */
function resampleStroke(pts, k) {
  const total = pathLength(pts)
  if (k === 1 || total === 0) return Array.from({ length: k }, () => pts[0])
  const step = total / (k - 1)
  const out = [pts[0]]
  let carried = 0
  let prev = pts[0]
  for (let i = 1; i < pts.length && out.length < k; i++) {
    let cur = pts[i]
    let d = dist(prev, cur)
    while (carried + d >= step && out.length < k) {
      const t = (step - carried) / d
      const q = [prev[0] + t * (cur[0] - prev[0]), prev[1] + t * (cur[1] - prev[1])]
      out.push(q)
      prev = q
      d = dist(prev, cur)
      carried = 0
    }
    carried += d
    prev = cur
  }
  while (out.length < k) out.push(pts[pts.length - 1])
  return out
}

const N = 32 // points in a cloud

/**
 * A drawing as a $P point cloud: N points shared between the strokes by length (each stroke
 * gets at least two, so the dot on an i counts), scaled to a unit square and centred.
 */
export function pointCloud(strokes) {
  if (!strokes.length || strokes.length > N / 2) return null
  const lens = strokes.map(pathLength)
  const total = lens.reduce((a, b) => a + b, 0)
  const min = 2
  const spare = N - min * strokes.length
  const share = lens.map((l) => (total ? (l / total) * spare : spare / strokes.length))
  const counts = share.map((s) => min + Math.floor(s))
  // Hand out what rounding down left over, biggest remainders first.
  let left = N - counts.reduce((a, b) => a + b, 0)
  const order = share.map((s, i) => [s - Math.floor(s), i]).sort((a, b) => b[0] - a[0])
  for (let j = 0; left > 0; j = (j + 1) % order.length, left--) counts[order[j][1]]++

  const pts = strokes.flatMap((s, i) => resampleStroke(s, counts[i]))
  const b = bounds(pts)
  const size = Math.max(b.w, b.h)
  if (size < 1e-6) return null
  const cx = pts.reduce((n, p) => n + p[0], 0) / N
  const cy = pts.reduce((n, p) => n + p[1], 0) / N
  return pts.map(([x, y]) => [(x - cx) / size, (y - cy) / size])
}

function cloudDistance(a, b, start, limit) {
  const matched = new Array(N).fill(false)
  let sum = 0
  let i = start
  do {
    let best = Infinity
    let index = -1
    for (let j = 0; j < N; j++) {
      if (matched[j]) continue
      const d = dist(a[i], b[j])
      if (d < best) {
        best = d
        index = j
      }
    }
    matched[index] = true
    sum += (1 - ((i - start + N) % N) / N) * best
    if (sum >= limit) return sum
    i = (i + 1) % N
  } while (i !== start)
  return sum
}

/** $P greedy cloud match: lower is more alike. Gives up early (returning Infinity) past `limit`. */
export function cloudMatch(a, b, limit = Infinity) {
  const step = Math.floor(Math.sqrt(N))
  let min = limit
  for (let i = 0; i < N; i += step) {
    min = Math.min(min, cloudDistance(a, b, i, min), cloudDistance(b, a, i, min))
  }
  return min < limit ? min : Infinity
}

// ---- Tidying a child's drawing ----

/**
 * Drop stray taps well away from the rest of the letter (a resting hand, a slip), but keep
 * small marks near it, like the dot on an i.
 */
export function tidy(strokes) {
  const real = strokes.filter((s) => s.length)
  return real.filter((s, i) => {
    if (pathLength(s) >= 4) return true
    const others = real.filter((_, j) => j !== i).flat()
    if (!others.length) return true
    return others.some((p) => dist(p, s[0]) < 32)
  })
}

/** The size of the letter on the lines, ignoring small marks like a dot. */
function extent(strokes) {
  const body = strokes.filter((s) => pathLength(s) >= 8)
  return bounds((body.length ? body : strokes).flat())
}

/** Which heights a drawing could be, from where it sits on the lines. */
function drawnHeight(strokes) {
  const e = extent(strokes)
  return { rises: e.minY < LINES.mid - 14, drops: e.maxY > LINES.base + 12 }
}

function fitsHeight(letter, h) {
  const k = heightOf(letter)
  if (k === 'tall') return h.rises
  if (k === 'tail') return h.drops
  return !h.drops
}

// ---- Recognising ----

// Each model is also kept narrower, wider and slanted both ways, because children's letters are.
const SHAPES = [['x', 1], ['x', 0.7], ['x', 1.4], ['s', 0.3], ['s', -0.3]]
function reshape(strokes, [kind, k]) {
  return strokes.map((s) =>
    s.map(([x, y]) => (kind === 'x' ? [50 + (x - 50) * k, y] : [x - k * (y - 80), y])),
  )
}

let models = null
function letterModels() {
  if (!models) {
    models = Object.entries(LETTERS).flatMap(([letter, ways]) =>
      ways.flatMap((strokes, way) => SHAPES.map((shape) => ({ letter, way, cloud: pointCloud(reshape(strokes, shape)) }))),
    )
  }
  return models
}

// How much worse than the best match the right letter can be and still count, so a letter
// that is roughly right isn't marked wrong for looking a little like another one.
const LENIENCY = 1.06
// A drawing further than this from a letter isn't that letter at all (a scribble, say).
const TOO_FAR = 2
// Letters that only differ by which way round or which way up they are. For these the right
// letter has to be the best match outright.
const MIRRORS = [['b', 'd'], ['p', 'q'], ['b', 'p'], ['d', 'q'], ['n', 'u'], ['m', 'w']]
const mirrored = (a, b) => MIRRORS.some(([x, y]) => (x === a && y === b) || (x === b && y === a))

/**
 * Score every letter against a drawing. Extra models (a child's own samples) can be passed as
 * { letter: [strokes, ...] }. With `expected`, that letter is scored first and other letters
 * are only scored as far as needed to know whether they beat it (the rest score Infinity),
 * which is much quicker on a tablet.
 * @returns {{ letter: string, score: number, way: number }[]} best first
 */
export function rankLetters(strokes, extra = {}, { expected = null } = {}) {
  const cloud = pointCloud(strokes)
  if (!cloud) return []
  const h = drawnHeight(strokes)
  const candidates = [
    ...letterModels(),
    ...Object.entries(extra).flatMap(([letter, samples]) =>
      (samples || []).map((s) => ({ letter, way: -1, cloud: pointCloud(s) })),
    ),
  ].filter((m) => m.cloud)
  if (expected) candidates.sort((a, b) => (b.letter === expected) - (a.letter === expected))

  const best = new Map()
  let mine = Infinity
  for (const m of candidates) {
    // A letter that doesn't sit on the lines the way the drawing does is less likely.
    const weight = fitsHeight(m.letter, h) ? 1 : 1.25
    const own = m.letter === expected
    const limit = !expected ? Infinity : own || mirrored(expected, m.letter) ? mine : mine / LENIENCY
    const score = cloudMatch(cloud, m.cloud, limit / weight) * weight
    if (own) mine = Math.min(mine, score)
    const prev = best.get(m.letter)
    if (!prev || score < prev.score) best.set(m.letter, { letter: m.letter, score, way: m.way })
  }
  for (const letter of Object.keys(LETTERS)) if (!best.has(letter)) best.set(letter, { letter, score: Infinity, way: 0 })
  return [...best.values()].sort((a, b) => a.score - b.score)
}

/**
 * Check one letter box.
 * @param {number[][][]} strokes what was drawn in the box
 * @param {string} expected the letter that belongs there
 * @param {{ extra?: object }} options
 * @returns {{ empty: boolean, ok: boolean, guess: string|null, tip: null|'start'|'way'|'tall'|'tail'|'small' }}
 *   guess is the letter it looks like when that isn't the expected one.
 */
export function checkLetter(strokes, expected, { extra = {} } = {}) {
  const ink = tidy(strokes)
  if (!ink.length) return { empty: true, ok: false, guess: null, tip: null }
  const verdict = judge(rankLetters(ink, extra, { expected }), expected)
  return { empty: false, ...verdict, tip: verdict.ok ? formationTip(ink, expected, verdict.way) : null }
}

/** Whether a ranking (from rankLetters) counts as the expected letter. */
export function judge(ranked, expected) {
  const mine = ranked.find((r) => r.letter === expected)
  const top = ranked[0]
  if (!mine || !top || mine.score > TOO_FAR) {
    return { ok: false, guess: top && top.score <= TOO_FAR ? top.letter : null, way: 0 }
  }
  const ok = top.letter === expected || (mine.score <= top.score * LENIENCY && !mirrored(expected, top.letter))
  return { ok, guess: ok ? null : top.letter, way: mine.way }
}

// ---- Formation ----

/** Signed area of a stroke: above zero goes round clockwise on screen, below zero anticlockwise. */
function turning(pts) {
  let a = 0
  for (let i = 1; i < pts.length; i++) a += pts[i - 1][0] * pts[i][1] - pts[i][0] * pts[i - 1][1]
  const last = pts[pts.length - 1]
  a += last[0] * pts[0][1] - pts[0][0] * last[1]
  return a / 2
}

/** Which way a stroke sets off: a unit vector over the first part of it. */
function setOff(pts) {
  const total = pathLength(pts)
  const want = Math.max(6, total * 0.2)
  let run = 0
  for (let i = 1; i < pts.length; i++) {
    run += dist(pts[i - 1], pts[i])
    if (run >= want) {
      const d = dist(pts[0], pts[i]) || 1
      return [(pts[i][0] - pts[0][0]) / d, (pts[i][1] - pts[0][1]) / d]
    }
  }
  const end = pts[pts.length - 1]
  const d = dist(pts[0], end) || 1
  return [(end[0] - pts[0][0]) / d, (end[1] - pts[0][1]) / d]
}

/** Where a point is within a letter's own outline: the centre is 0, 0 and the longer side is 1. */
function placeIn(p, b) {
  const size = Math.max(b.w, b.h, 1)
  return [(p[0] - (b.minX + b.maxX) / 2) / size, (p[1] - (b.minY + b.maxY) / 2) / size]
}

/**
 * A tip on how a correctly read letter was formed, or null if it was formed well. Gentle on
 * purpose: only clear differences from the school way count.
 */
export function formationTip(strokes, letter, way = 0) {
  const model = LETTERS[letter]?.[Math.max(way, 0)] ?? LETTERS[letter]?.[0]
  if (!model) return null
  const body = strokes.filter((s) => pathLength(s) >= 8)
  const first = body[0]
  if (!first) return null
  const target = model[0]

  // Which way: setting off the opposite way, or going round the wrong way.
  const [ax, ay] = setOff(first)
  const [bx, by] = setOff(target)
  if (ax * bx + ay * by < -0.3) return 'way'
  if (ANTICLOCKWISE.has(letter)) {
    const b = bounds(first)
    if (turning(first) > 0.12 * b.w * b.h) return 'way'
  }

  // Where it starts, compared within the letter's own outline.
  const mine = placeIn(first[0], extent(strokes))
  const theirs = placeIn(target[0], extent(model))
  if (dist(mine, theirs) > 0.5) return 'start'

  // How it sits on the lines.
  const e = extent(strokes)
  const kind = heightOf(letter)
  // t is shorter than the other tall letters.
  if (kind === 'tall' && e.minY > LINES.mid - (letter === 't' ? 6 : 14)) return 'tall'
  if (kind === 'tail' && e.maxY < LINES.base + 10) return 'tail'
  if (kind === 'small' && e.minY < LINES.top + 18) return 'small'
  return null
}
