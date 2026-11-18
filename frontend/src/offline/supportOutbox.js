// Help requests to the administrator, offline-first like the other forms (docs/DEVIATIONS.md W51).
//
// 1. queueSupport() saves the ticket (or reply) on the phone with a new client_uuid, including the
//    screenshot file itself, then tries to send it at once.
// 2. flushSupport() sends every waiting item, oldest first:
//      - first the screenshot (POST /uploads/support-screenshots); its file id is saved on the item, so a
//        retry never uploads it twice
//      - then the ticket (POST /support/tickets) or reply (POST /support/tickets/:id/messages) with the
//        client_uuid: the server returns the first record if it already arrived (idempotent)
//    No connection or server asleep -> kept for later. Refused by the server (e.g. a field is invalid)
//    -> kept with status "failed" and the reason, so the person can see it and try again or discard it.
// Sending is retried when the connection returns and every minute (startSupportAutoSync).
import api, { errorCode } from '../api/client'
import { db } from './db'
import { emit } from './sync'

let flushing = false

export async function queueSupport({ kind, ticketId = null, data, screenshot = null }) {
  const clientUuid = crypto.randomUUID()
  await db.supportOutbox.add({ client_uuid: clientUuid, kind, ticket_id: ticketId, data, screenshot, file_id: null, status: 'pending', created_at: Date.now() })
  emit()
  await flushSupport()
  const row = await db.supportOutbox.where('client_uuid').equals(clientUuid).first()
  if (!row) return { status: 'sent' }
  if (row.status === 'failed') {
    await db.supportOutbox.delete(row.id)
    emit()
    return { status: 'failed', code: row.error }
  }
  return { status: 'queued' }
}

// A server answer (4xx) means "this item is wrong", anything else means "try again later"
const refused = (error) => error?.response && error.response.status >= 400 && error.response.status < 500 && error.response.status !== 429

export async function flushSupport() {
  if (flushing || !navigator.onLine) return
  const items = await db.supportOutbox.where('status').equals('pending').sortBy('id')
  if (!items.length) return
  flushing = true
  try {
    for (const item of items) {
      try {
        let fileId = item.file_id
        if (item.screenshot && !fileId) {
          const upload = await api.post('/uploads/support-screenshots', item.screenshot, {
            headers: { 'Content-Type': item.screenshot.type, 'X-File-Name': encodeURIComponent(item.screenshot.name || 'screenshot') },
          })
          fileId = upload.data.file.id
          await db.supportOutbox.update(item.id, { file_id: fileId })
        }
        const body = { ...item.data, client_uuid: item.client_uuid, attachment_file_id: fileId || null }
        if (item.kind === 'ticket') await api.post('/support/tickets', body)
        else await api.post(`/support/tickets/${item.ticket_id}/messages`, body)
        await db.supportOutbox.delete(item.id)
      } catch (error) {
        if (refused(error)) await db.supportOutbox.update(item.id, { status: 'failed', error: errorCode(error) })
        else break // offline or server asleep: keep the order, try again later
      }
    }
  } finally {
    flushing = false
    emit()
  }
}

// Items still on this phone (shown as "Waiting to send" in My messages)
export async function waitingSupport() {
  return db.supportOutbox.toArray()
}

export async function discardSupport(id) {
  await db.supportOutbox.delete(id)
  emit()
}

let started = false
export function startSupportAutoSync() {
  if (started) return
  started = true
  window.addEventListener('online', () => flushSupport())
  setInterval(() => flushSupport(), 60 * 1000)
}
