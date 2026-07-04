import { useSyncExternalStore } from 'react'
import type { ThreatMapPoint, ThreatMapResponse } from '../types'

export interface ThreatSnapshot {
  points: ThreatMapPoint[]
  source: 'live' | 'sim' | null
  updatedAt: number
}

const EMPTY: ThreatSnapshot = { points: [], source: null, updatedAt: 0 }

let snapshot: ThreatSnapshot = EMPTY
const listeners = new Set<() => void>()

export const cyberThreatStore = {
  getSnapshot(): ThreatSnapshot {
    return snapshot
  },
  subscribe(cb: () => void): () => void {
    listeners.add(cb)
    return () => {
      listeners.delete(cb)
    }
  },
  update(resp: ThreatMapResponse) {
    snapshot = { points: resp.points, source: resp.source, updatedAt: Date.now() }
    for (const l of listeners) l()
  },
}

export function useThreatSnapshot(): ThreatSnapshot {
  return useSyncExternalStore(cyberThreatStore.subscribe, cyberThreatStore.getSnapshot)
}
