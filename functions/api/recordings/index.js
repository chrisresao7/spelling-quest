// /api/recordings (the list). The [[path]].js next to this handles single recordings.
import { handleRecordings } from '../../../server/recordings.js'

export function onRequest({ request, env }) {
  return handleRecordings(request, undefined, env.RECORDINGS)
}
