import { useSyncExternalStore } from 'react'
import type { SatPosition } from '../types'

export interface SatSnapshot {
  positions: SatPosition[]
  orbit: number[][][] // ground-track segments of the selected satellite
  updatedAt: number
}

const EMPTY: SatSnapshot = { positions: [], orbit: [], updatedAt: 0 }

let snapshot: SatSnapshot = EMPTY
const listeners = new Set<() => void>()

export const satelliteStore = {
  getSnapshot: (): SatSnapshot => snapshot,
  subscribe(cb: () => void): () => void {
    listeners.add(cb)
    return () => {
      listeners.delete(cb)
    }
  },
  update(positions: SatPosition[], orbit: number[][][]) {
    snapshot = { positions, orbit, updatedAt: Date.now() }
    for (const l of listeners) l()
  },
}

export function useSatSnapshot(): SatSnapshot {
  return useSyncExternalStore(satelliteStore.subscribe, satelliteStore.getSnapshot)
}
