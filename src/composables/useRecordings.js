import { reactive } from 'vue'

// Grown-ups' own recordings of the week's sounds and words.
// Each one is kept in this browser (IndexedDB, so it plays offline) and, when the site is
// on Cloudflare with the recordings store set up, shared with every other device that
// opens the game (see server/recordings.js). Keys look like "sound:ae" or "word:said".

const DB = 'spelling-quest'
const STORE = 'recordings'
const API = `${import.meta.env.BASE_URL}api/recordings`

/** key -> { updated, synced } for every recording on this device. */
export const recordings = reactive({})
/** Whether recordings are being shared between devices: null until we know. */
export const sharing = reactive({ on: null })

const blobs = new Map()
const deleted = new Map() // key -> updated, deletions still to tell the server about

let dbPromise = null
function db() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  dbPromise ||= new Promise((resolve) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'key' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve(null)
  })
  return dbPromise
}

async function tx(mode, fn) {
  const d = await db()
  if (!d) return null
  return new Promise((resolve) => {
    const t = d.transaction(STORE, mode)
    const req = fn(t.objectStore(STORE))
    t.oncomplete = () => resolve(req?.result ?? null)
    t.onerror = () => resolve(null)
  })
}

const putLocal = (row) => tx('readwrite', (s) => s.put(row))
const deleteLocal = (key) => tx('readwrite', (s) => s.delete(key))

function remember(row) {
  if (row.deleted) {
    deleted.set(row.key, row.updated)
    delete recordings[row.key]
    blobs.delete(row.key)
  } else {
    deleted.delete(row.key)
    blobs.set(row.key, row.blob)
    recordings[row.key] = { updated: row.updated, synced: !!row.synced }
  }
}

const url = (key) => `${API}/${encodeURIComponent(key)}`

async function upload(key) {
  const res = await fetch(url(key), {
    method: 'PUT',
    headers: { 'Content-Type': 'audio/wav', 'X-Updated': String(recordings[key].updated) },
    body: blobs.get(key),
  })
  if (!res.ok) throw new Error(`upload ${res.status}`)
  const row = { key, blob: blobs.get(key), updated: recordings[key].updated, synced: true }
  remember(row)
  await putLocal(row)
}

async function download(key, updated) {
  const res = await fetch(url(key))
  if (!res.ok) throw new Error(`download ${res.status}`)
  const row = { key, blob: await res.blob(), updated, synced: true }
  remember(row)
  await putLocal(row)
}

/** Bring this device and the shared store up to date with each other. */
export async function syncRecordings() {
  let remote
  try {
    const res = await fetch(API, { headers: { Accept: 'application/json' } })
    if (!res.ok || !res.headers.get('content-type')?.includes('json')) throw new Error()
    remote = (await res.json()).recordings
  } catch {
    sharing.on = false
    return
  }
  sharing.on = true
  try {
    for (const [key, updated] of deleted) {
      if ((remote[key] ?? 0) <= updated) {
        await fetch(url(key), { method: 'DELETE' })
        delete remote[key]
      }
      deleted.delete(key)
      await deleteLocal(key)
    }
    for (const [key, updated] of Object.entries(remote)) {
      const mine = recordings[key]
      if (!mine || mine.updated < updated) await download(key, updated)
    }
    for (const [key, mine] of Object.entries({ ...recordings })) {
      if (key in remote) continue
      if (mine.synced) {
        // It was shared before and has gone from the store: deleted on another device.
        delete recordings[key]
        blobs.delete(key)
        await deleteLocal(key)
      } else {
        await upload(key)
      }
    }
  } catch {
    // Offline part-way through: what's on this device still plays; it syncs next time.
  }
}

let ready = null
/** Load this device's recordings, then sync in the background. */
export function loadRecordings() {
  ready ||= (async () => {
    const rows = (await tx('readonly', (s) => s.getAll())) || []
    rows.forEach(remember)
    syncRecordings()
  })()
  return ready
}

export function getRecording(key) {
  return blobs.get(key) || null
}

export async function saveRecording(key, blob) {
  const row = { key, blob, updated: Date.now(), synced: false }
  remember(row)
  await putLocal(row)
  try {
    await upload(key)
    sharing.on = true
  } catch {
    // Kept on this device; it's uploaded at the next sync.
  }
}

export async function deleteRecording(key) {
  const row = { key, updated: Date.now(), deleted: true }
  remember(row)
  await putLocal(row)
  try {
    const res = await fetch(url(key), { method: 'DELETE' })
    if (!res.ok) throw new Error()
    deleted.delete(key)
    await deleteLocal(key)
  } catch {
    // Told to the server at the next sync.
  }
}
