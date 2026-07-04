import { useSyncExternalStore } from 'react'
import type { Ship, ShipsResponse } from '../types'

export interface ShipSnapshot {
  ships: Ship[]
  byMmsi: Record<number, Ship>
  source: 'live' | 'sim' | null
  now: number
  updatedAt: number
}

const EMPTY: ShipSnapshot = { ships: [], byMmsi: {}, source: null, now: 0, updatedAt: 0 }

let snapshot: ShipSnapshot = EMPTY
const trails = new Map<number, [number, number][]>()
const TRAIL_MAX = 40
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

function pushTrail(mmsi: number, lon: number, lat: number) {
  const t = trails.get(mmsi)
  if (!t) {
    trails.set(mmsi, [[lon, lat]])
    return
  }
  const last = t[t.length - 1]
  if (Math.abs(last[0] - lon) < 0.0006 && Math.abs(last[1] - lat) < 0.0006) return
  t.push([lon, lat])
  if (t.length > TRAIL_MAX) t.shift()
}

export const shipStore = {
  getSnapshot(): ShipSnapshot {
    return snapshot
  },
  subscribe(cb: () => void): () => void {
    listeners.add(cb)
    return () => {
      listeners.delete(cb)
    }
  },
  update(resp: ShipsResponse) {
    const byMmsi: Record<number, Ship> = {}
    const present = new Set<number>()
    for (const s of resp.ships) {
      byMmsi[s.mmsi] = s
      present.add(s.mmsi)
      pushTrail(s.mmsi, s.lon, s.lat)
    }
    if (trails.size > 3000) {
      for (const mmsi of trails.keys()) if (!present.has(mmsi)) trails.delete(mmsi)
    }
    snapshot = { ships: resp.ships, byMmsi, source: resp.source, now: resp.now, updatedAt: Date.now() }
    emit()
  },
  trailFor(mmsi: number | null): [number, number][] {
    if (mmsi == null) return []
    return trails.get(mmsi) ?? []
  },
}

export function useShipSnapshot(): ShipSnapshot {
  return useSyncExternalStore(shipStore.subscribe, shipStore.getSnapshot)
}
