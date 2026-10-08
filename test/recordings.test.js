import { describe, expect, it } from 'vitest'
import { handleRecordings } from '../server/recordings.js'

// A stand-in for the Cloudflare R2 bucket.
function fakeBucket() {
  const items = new Map()
  return {
    items,
    async list({ prefix }) {
      const objects = [...items].filter(([k]) => k.startsWith(prefix)).map(([key, v]) => ({ key, ...v }))
      return { objects, truncated: false }
    },
    async get(key) {
      const v = items.get(key)
      return v ? { body: v.body } : null
    },
    async put(key, body, opts) {
      items.set(key, { body, customMetadata: opts.customMetadata, uploaded: new Date() })
    },
    async delete(key) {
      items.delete(key)
    },
  }
}

const req = (method, body, headers) => new Request('https://game.example/api/recordings', { method, body, headers })

describe('shared recordings store', () => {
  it('saves, lists, returns and deletes a recording', async () => {
    const bucket = fakeBucket()
    const put = await handleRecordings(req('PUT', new Uint8Array([1, 2, 3]), { 'X-Updated': '1234' }), 'sound:ae', bucket)
    expect(put.status).toBe(200)

    const list = await (await handleRecordings(req('GET'), undefined, bucket)).json()
    expect(list).toEqual({ recordings: { 'sound:ae': 1234 } })

    const got = await handleRecordings(req('GET'), 'sound:ae', bucket)
    expect(new Uint8Array(await got.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]))

    await handleRecordings(req('DELETE'), 'sound:ae', bucket)
    expect(bucket.items.size).toBe(0)
    expect((await handleRecordings(req('GET'), 'sound:ae', bucket)).status).toBe(404)
  })

  it('refuses odd names and empty files', async () => {
    const bucket = fakeBucket()
    expect((await handleRecordings(req('GET'), '../secret', bucket)).status).toBe(400)
    expect((await handleRecordings(req('PUT', new Uint8Array([])), 'word:said', bucket)).status).toBe(413)
  })

  it('says so when the store is not set up', async () => {
    expect((await handleRecordings(req('GET'), undefined, undefined)).status).toBe(503)
  })
})
