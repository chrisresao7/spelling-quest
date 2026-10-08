// The Cloudflare Worker that serves the game. Everything is the built site (dist/), except
// /api/recordings, the shared store for grown-ups' recordings (see recordings.js).
// Settings, including the R2 bucket, are in wrangler.jsonc.
import { handleRecordings } from './recordings.js'

export default {
  fetch(request, env) {
    const m = new URL(request.url).pathname.match(/^\/api\/recordings(?:\/(.+))?\/?$/)
    if (m) return handleRecordings(request, m[1] ? decodeURIComponent(m[1]) : undefined, env.RECORDINGS)
    return env.ASSETS.fetch(request)
  },
}
