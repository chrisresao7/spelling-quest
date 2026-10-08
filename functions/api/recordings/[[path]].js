// Cloudflare Pages Function for /api/recordings and /api/recordings/<key>.
// The R2 bucket is bound as RECORDINGS in the Pages project's settings (see README).
import { handleRecordings } from '../../../server/recordings.js'

export function onRequest({ request, params, env }) {
  const key = params.path?.length ? decodeURIComponent(params.path.join('/')) : undefined
  return handleRecordings(request, key, env.RECORDINGS)
}
