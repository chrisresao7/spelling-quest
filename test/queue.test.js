import { describe, expect, it } from 'vitest'
import { createQueue } from '../src/lib/queue.js'

const noShuffle = () => 0.999

describe('createQueue', () => {
  it('runs through every item once when all are right', () => {
    const q = createQueue(['a', 'b', 'c'], { rand: noShuffle })
    const seen = []
    while (!q.finished) {
      seen.push(q.current)
      q.next(true)
    }
    expect(seen.sort()).toEqual(['a', 'b', 'c'])
    expect(q.progress).toBe(1)
  })

  it('brings a missed item back a couple of turns later', () => {
    const q = createQueue(['a', 'b', 'c', 'd'], { rand: noShuffle, gap: 2 })
    const first = q.current
    q.next(false)
    const order = []
    while (!q.finished) {
      order.push(q.current)
      q.next(true)
    }
    expect(order.indexOf(first)).toBe(2)
    expect(order).toHaveLength(4)
  })

  it('stops retrying after maxRetries', () => {
    const q = createQueue(['a'], { maxRetries: 2 })
    let turns = 0
    while (!q.finished) {
      q.next(false)
      turns++
    }
    expect(turns).toBe(3)
  })
})
