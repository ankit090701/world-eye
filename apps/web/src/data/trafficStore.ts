import { useSyncExternalStore } from 'react'
import type { FlowPoint, TrafficIncident, TrafficResponse } from '../types'

export interface TrafficSnapshot {
  incidents: TrafficIncident[]
  incidentsById: Record<string, TrafficIncident>
  flow: FlowPoint[]
  source: 'live' | 'sim' | null
  now: number
  updatedAt: number
}

const EMPTY: TrafficSnapshot = {
  incidents: [],
  incidentsById: {},
  flow: [],
  source: null,
  now: 0,
  updatedAt: 0,
}

let snapshot: TrafficSnapshot = EMPTY
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

export const trafficStore = {
  getSnapshot(): TrafficSnapshot {
    return snapshot
  },
  subscribe(cb: () => void): () => void {
    listeners.add(cb)
    return () => {
      listeners.delete(cb)
    }
  },
  update(resp: TrafficResponse) {
    const incidentsById: Record<string, TrafficIncident> = {}
    for (const i of resp.incidents) incidentsById[i.id] = i
    snapshot = {
      incidents: resp.incidents,
      incidentsById,
      flow: resp.flow,
      source: resp.source,
      now: resp.now,
      updatedAt: Date.now(),
    }
    emit()
  },
}

export function useTrafficSnapshot(): TrafficSnapshot {
  return useSyncExternalStore(trafficStore.subscribe, trafficStore.getSnapshot)
}
