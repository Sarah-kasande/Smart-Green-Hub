// The phone's offline store (IndexedDB through Dexie). It survives closing the browser and
// restarting the phone (NFR06).
//   outbox: changes recorded on this phone that the server has not confirmed yet
//   cache:  the last copy of server data (batches, species) so lists still show offline
import Dexie from 'dexie'

export const db = new Dexie('smart_green_hub')

db.version(1).stores({
  // ++id = auto number (keeps the order the changes were made); status: pending | conflict
  outbox: '++id, client_uuid, status',
  cache: 'key',
})

export async function readCache(key) {
  const row = await db.cache.get(key)
  return row ? row.value : null
}

export async function writeCache(key, value) {
  await db.cache.put({ key, value, saved_at: Date.now() })
}

// Called on sign-out so the next person using this phone does not see the previous data
export async function clearOfflineData() {
  await db.outbox.clear()
  await db.cache.clear()
}
