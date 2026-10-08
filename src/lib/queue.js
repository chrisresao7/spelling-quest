// A round of questions. Items answered wrongly come back a few turns later,
// so a tricky word gets another go before the scene ends.

export function shuffle(items, rand = Math.random) {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function createQueue(items, { rand = Math.random, gap = 2, maxRetries = 2 } = {}) {
  const queue = shuffle(items, rand).map((item) => ({ item, retries: 0 }))
  let total = queue.length
  let done = 0

  return {
    get current() {
      return queue[0]?.item ?? null
    },
    get finished() {
      return queue.length === 0
    },
    /** Progress from 0 to 1, counting retries as extra steps. */
    get progress() {
      return total === 0 ? 1 : done / total
    },
    /** Move on. A missed item is put back `gap` places later (up to maxRetries times). */
    next(gotItRight) {
      const head = queue.shift()
      if (!head) return
      done++
      if (!gotItRight && head.retries < maxRetries) {
        queue.splice(Math.min(gap, queue.length), 0, { item: head.item, retries: head.retries + 1 })
        total++
      }
    },
  }
}
