import { useSyncExternalStore } from 'react'
import type { SocialMapPoint } from '../types'

export interface SocialMapSnapshot {
  points: SocialMapPoint[]
  origin: 'live' | 'sim' | null
  updatedAt: number
}

const EMPTY: SocialMapSnapshot = { points: [], origin: null, updatedAt: 0 }

let snapshot: SocialMapSnapshot = EMPTY
const listeners = new Set<() => void>()

export const socialMapStore = {
  getSnapshot: (): SocialMapSnapshot => snapshot,
  subscribe(cb: () => void): () => void {
    listeners.add(cb)
    return () => {
      listeners.delete(cb)
    }
  },
  update(points: SocialMapPoint[], origin: 'live' | 'sim') {
    snapshot = { points, origin, updatedAt: Date.now() }
    for (const l of listeners) l()
  },
}

export function useSocialMap(): SocialMapSnapshot {
  return useSyncExternalStore(socialMapStore.subscribe, socialMapStore.getSnapshot)
}
