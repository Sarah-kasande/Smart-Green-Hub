// Offline recording and synchronisation (FR13, Figure 12).
//
// 1. record(type, data) saves the change in the outbox with a new client_uuid (status "pending")
//    and immediately tries to send it. This is used online AND offline, so there is only one path.
// 2. syncNow() sends every pending change, oldest first, to POST /api/operator/sync.
// 3. The server answers per change:
//      applied / skipped -> removed from the outbox (skipped = it had arrived before; harmless)
//      conflict          -> kept with status "conflict" and the reason, for the operator to see
// 4. The answer also contains the latest batches and species, saved in the cache for offline use.
// Sync starts automatically when the app opens, when the connection returns ("online" event)
// and every minute while the app is open (NFR06).
import api, { errorCode } from '../api/client'
import { db, writeCache } from './db'

const listeners = new Set()
let syncing = false
let lastResult = null

// Components subscribe to hear about outbox changes (see SyncProvider.jsx)
export function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
function emit() {
  listeners.forEach((listener) => listener())
}

export async function outboxCounts() {
  const pending = await db.outbox.where('status').equals('pending').count()
  const conflicts = await db.outbox.where('status').equals('conflict').toArray()
  return { pending, conflicts, lastResult, syncing }
}

export async function syncNow() {
  if (syncing || !navigator.onLine) return null
  const pending = await db.outbox.where('status').equals('pending').sortBy('id')
  if (pending.length === 0) return null

  syncing = true
  emit()
  try {
    const { data } = await api.post('/operator/sync', {
      changes: pending.map((p) => ({ client_uuid: p.client_uuid, type: p.type, data: p.data })),
    })
    const done = new Set([...data.applied, ...data.skipped])
    for (const item of pending) {
      const conflict = data.conflicts.find((c) => c.client_uuid === item.client_uuid)
      if (done.has(item.client_uuid)) await db.outbox.delete(item.id)
      else if (conflict) await db.outbox.update(item.id, { status: 'conflict', error: conflict.code, details: conflict.details || null })
    }
    await writeCache('batches', data.server_changes.batches)
    await writeCache('species', data.server_changes.species)
    lastResult = { applied: data.applied.length, skipped: data.skipped.length, conflicts: data.conflicts.length, at: Date.now() }
    return data
  } catch (error) {
    // No connection or server asleep: keep everything and try again later
    lastResult = { error: errorCode(error), at: Date.now() }
    return null
  } finally {
    syncing = false
    emit()
  }
}

// Records one change. Returns
//   { status: 'synced' }                       the server accepted it
//   { status: 'queued' }                       saved on the phone, will be sent later
//   { status: 'conflict', code, details }      the server refused it (e.g. not enough stock)
export async function record(type, data) {
  const clientUuid = crypto.randomUUID()
  await db.outbox.add({ client_uuid: clientUuid, type, data, status: 'pending', created_at: Date.now() })
  emit()
  await syncNow()
  const row = await db.outbox.where('client_uuid').equals(clientUuid).first()
  if (!row) return { status: 'synced', client_uuid: clientUuid }
  if (row.status === 'conflict') {
    // The operator saw the problem right away on the form, so it does not need to stay in the list
    await db.outbox.delete(row.id)
    emit()
    return { status: 'conflict', code: row.error, details: row.details }
  }
  return { status: 'queued', client_uuid: clientUuid }
}

export async function pendingOfType(type) {
  return db.outbox.where('status').equals('pending').filter((row) => row.type === type).toArray()
}

export async function discard(id) {
  await db.outbox.delete(id)
  emit()
}

let started = false
export function startAutoSync() {
  if (started) return
  started = true
  window.addEventListener('online', () => syncNow())
  setInterval(() => syncNow(), 60 * 1000)
}
