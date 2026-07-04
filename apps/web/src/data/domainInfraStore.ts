import { useSyncExternalStore } from 'react'
import type { DomainInfraPoint } from '../types'

export interface DomainInfraSnapshot {
  domain: string | null
  points: DomainInfraPoint[]
  updatedAt: number
}

const EMPTY: DomainInfraSnapshot = { domain: null, points: [], updatedAt: 0 }

let snapshot: DomainInfraSnapshot = EMPTY
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

// Holds the geolocated hosting footprint of the most-recently looked-up domain.
// Populated on lookup (not polled) — mirrors how the cyber marker is set.
export const domainInfraStore = {
  getSnapshot(): DomainInfraSnapshot {
    return snapshot
  },
  subscribe(cb: () => void): () => void {
    listeners.add(cb)
    return () => {
      listeners.delete(cb)
    }
  },
  update(domain: string, points: DomainInfraPoint[]) {
    snapshot = { domain, points, updatedAt: Date.now() }
    emit()
  },
  clear() {
    if (snapshot === EMPTY) return
    snapshot = EMPTY
    emit()
  },
}

export function useDomainInfraSnapshot(): DomainInfraSnapshot {
  return useSyncExternalStore(domainInfraStore.subscribe, domainInfraStore.getSnapshot)
}
