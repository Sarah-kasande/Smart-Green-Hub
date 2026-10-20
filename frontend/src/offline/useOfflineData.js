// Batches and species for operator screens, working offline too.
// Online: read from the server and save a copy on the phone.
// Offline: use the saved copy, plus batches created offline that are still waiting to sync.
import { useEffect, useState } from 'react'
import api from '../api/client'
import { readCache, writeCache } from './db'
import { pendingOfType, subscribe } from './sync'

// Turns a batch waiting in the outbox into something a list can show
function pendingBatchToRow(row, speciesList) {
  const species = speciesList.find((s) => s.id === Number(row.data.species_id))
  return {
    id: null,
    client_uuid: row.client_uuid,
    pending: true,
    species: species || { common_name: '?' },
    quantity_current: Number(row.data.quantity),
    quantity_initial: Number(row.data.quantity),
    available: Number(row.data.quantity),
    unit_price: Number(row.data.unit_price) || 0,
    planting_date: row.data.planting_date,
    stage: row.data.stage || 'seedling',
  }
}

export function useSpecies() {
  const [species, setSpecies] = useState([])
  useEffect(() => {
    let cancelled = false
    api
      .get('/species')
      .then(async (res) => {
        await writeCache('species', res.data.species)
        if (!cancelled) setSpecies(res.data.species)
      })
      .catch(async () => {
        const cached = (await readCache('species')) || []
        if (!cancelled) setSpecies(cached)
      })
    return () => {
      cancelled = true
    }
  }, [])
  return species
}

export function useBatches(stage = '') {
  const [state, setState] = useState({ batches: null, offline: false })
  const [version, setVersion] = useState(0)

  // Reload when the outbox changes (e.g. an offline batch was synced)
  useEffect(() => subscribe(() => setVersion((v) => v + 1)), [])

  useEffect(() => {
    let cancelled = false
    async function withPending(list) {
      const speciesList = (await readCache('species')) || []
      const pending = (await pendingOfType('batch')).map((row) => pendingBatchToRow(row, speciesList))
      return [...pending.filter((b) => !stage || b.stage === stage), ...list]
    }
    api
      .get(`/operator/batches${stage ? `?stage=${stage}` : ''}`)
      .then(async (res) => {
        if (!stage) await writeCache('batches', res.data.batches)
        const list = await withPending(res.data.batches)
        if (!cancelled) setState({ batches: list, offline: false })
      })
      .catch(async () => {
        const cached = (await readCache('batches')) || []
        const list = await withPending(stage && stage !== 'all' ? cached.filter((b) => b.stage === stage) : cached)
        if (!cancelled) setState({ batches: list, offline: true })
      })
    return () => {
      cancelled = true
    }
  }, [stage, version])

  return { ...state, reload: () => setVersion((v) => v + 1) }
}
