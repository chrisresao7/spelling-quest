import { ref, shallowRef } from 'vue'
import { createQueue } from '../lib/queue.js'

/** A reactive wrapper round createQueue for use in a game component. */
export function useRound(items, options) {
  const q = createQueue(items, options)
  const current = shallowRef(q.current)
  const progress = ref(0)
  const finished = ref(q.finished)

  function next(gotItRight) {
    q.next(gotItRight)
    current.value = q.current
    progress.value = q.progress
    finished.value = q.finished
  }

  return { current, progress, finished, next }
}
