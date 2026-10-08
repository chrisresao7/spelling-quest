// The shared recordings store: part of the Cloudflare Worker (worker.js), in front of an R2 bucket.
// It only answers on the game's own site, which Cloudflare Access already keeps private.
//
//   GET    /api/recordings          -> { recordings: { "sound:ae": updated, ... } }
//   GET    /api/recordings/<key>    -> the WAV file
//   PUT    /api/recordings/<key>    -> save (header X-Updated: time it was recorded)
//   DELETE /api/recordings/<key>

const KEY = /^(sound|word):[a-z' _-]{1,40}$/
const MAX_BYTES = 2 * 1024 * 1024
const PREFIX = 'recordings/'

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

/**
 * @param {Request} request
 * @param {string|undefined} key from the URL, already decoded
 * @param {R2Bucket|undefined} bucket the RECORDINGS binding
 */
export async function handleRecordings(request, key, bucket) {
  if (!bucket) return json({ error: 'The recordings store is not set up (no RECORDINGS binding).' }, 503)

  if (!key) {
    if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405)
    const recordings = {}
    let cursor
    do {
      const page = await bucket.list({ prefix: PREFIX, cursor, include: ['customMetadata'] })
      for (const o of page.objects) {
        recordings[o.key.slice(PREFIX.length)] = Number(o.customMetadata?.updated) || o.uploaded.getTime()
      }
      cursor = page.truncated ? page.cursor : undefined
    } while (cursor)
    return json({ recordings })
  }

  if (!KEY.test(key)) return json({ error: 'Bad recording name' }, 400)
  const name = PREFIX + key

  switch (request.method) {
    case 'GET': {
      const obj = await bucket.get(name)
      if (!obj) return json({ error: 'Not found' }, 404)
      return new Response(obj.body, {
        headers: { 'Content-Type': 'audio/wav', 'Cache-Control': 'no-store' },
      })
    }
    case 'PUT': {
      const body = await request.arrayBuffer()
      if (!body.byteLength || body.byteLength > MAX_BYTES) return json({ error: 'Recording is empty or too big' }, 413)
      const updated = Number(request.headers.get('X-Updated')) || Date.now()
      await bucket.put(name, body, {
        httpMetadata: { contentType: 'audio/wav' },
        customMetadata: { updated: String(updated) },
      })
      return json({ key, updated })
    }
    case 'DELETE':
      await bucket.delete(name)
      return json({ key, deleted: true })
    default:
      return json({ error: 'Method not allowed' }, 405)
  }
}
