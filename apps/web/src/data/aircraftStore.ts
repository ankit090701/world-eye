import { useSyncExternalStore } from 'react'
import type { Aircraft, AircraftResponse } from '../types'

export interface AircraftSnapshot {
  aircraft: Aircraft[]
  byHex: Record<string, Aircraft>
  source: 'live' | 'sim' | null
  now: number
  updatedAt: number
}

const EMPTY: AircraftSnapshot = {
  aircraft: [],
  byHex: {},
  source: null,
  now: 0,
  updatedAt: 0,
}

let snapshot: AircraftSnapshot = EMPTY
const trails = new Map<string, [number, number][]>()
const TRAIL_MAX = 60
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

function pushTrail(hex: string, lon: number, lat: number) {
  const t = trails.get(hex)
  if (!t) {
    trails.set(hex, [[lon, lat]])
    return
  }
  const last = t[t.length - 1]
  if (Math.abs(last[0] - lon) < 0.0004 && Math.abs(last[1] - lat) < 0.0004) return
  t.push([lon, lat])
  if (t.length > TRAIL_MAX) t.shift()
}

export const aircraftStore = {
  getSnapshot(): AircraftSnapshot {
    return snapshot
  },
  subscribe(cb: () => void): () => void {
    listeners.add(cb)
    return () => {
      listeners.delete(cb)
    }
  },
  update(resp: AircraftResponse) {
    const byHex: Record<string, Aircraft> = {}
    const present = new Set<string>()
    for (const a of resp.aircraft) {
      byHex[a.hex] = a
      present.add(a.hex)
      pushTrail(a.hex, a.lon, a.lat)
    }
    // bound trail memory: drop trails for aircraft no longer in view (when large)
    if (trails.size > 1200) {
      for (const hex of trails.keys()) {
        if (!present.has(hex)) trails.delete(hex)
      }
    }
    snapshot = {
      aircraft: resp.aircraft,
      byHex,
      source: resp.source,
      now: resp.now,
      updatedAt: Date.now(),
    }
    emit()
  },
  trailFor(hex: string | null): [number, number][] {
    if (!hex) return []
    return trails.get(hex) ?? []
  },
  clear() {
    trails.clear()
    snapshot = EMPTY
    emit()
  },
}

export function useAircraftSnapshot(): AircraftSnapshot {
  return useSyncExternalStore(aircraftStore.subscribe, aircraftStore.getSnapshot)
}
