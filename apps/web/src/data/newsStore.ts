import { useSyncExternalStore } from 'react'
import type { NewsMapPoint } from '../types'

export interface NewsMapSnapshot {
  points: NewsMapPoint[]
  source: 'live' | 'sim' | null
  updatedAt: number
}

const EMPTY: NewsMapSnapshot = { points: [], source: null, updatedAt: 0 }

let snapshot: NewsMapSnapshot = EMPTY
const listeners = new Set<() => void>()

export const newsMapStore = {
  getSnapshot: (): NewsMapSnapshot => snapshot,
  subscribe(cb: () => void): () => void {
    listeners.add(cb)
    return () => {
      listeners.delete(cb)
    }
  },
  update(points: NewsMapPoint[], source: 'live' | 'sim') {
    snapshot = { points, source, updatedAt: Date.now() }
    for (const l of listeners) l()
  },
}

export function useNewsMap(): NewsMapSnapshot {
  return useSyncExternalStore(newsMapStore.subscribe, newsMapStore.getSnapshot)
}
