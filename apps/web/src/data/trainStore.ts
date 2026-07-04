import { useSyncExternalStore } from 'react'
import type { Train, TrainsResponse } from '../types'
import { bearingDeg } from '../lib/geo'

export interface TrainSnapshot {
  trains: Train[]
  byId: Record<string, Train>
  source: 'live' | 'sim' | null
  now: number
  updatedAt: number
}

const EMPTY: TrainSnapshot = { trains: [], byId: {}, source: null, now: 0, updatedAt: 0 }

let snapshot: TrainSnapshot = EMPTY
const trails = new Map<string, [number, number][]>()
const headings = new Map<string, number>()
const TRAIL_MAX = 50
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

export const trainStore = {
  getSnapshot(): TrainSnapshot {
    return snapshot
  },
  subscribe(cb: () => void): () => void {
    listeners.add(cb)
    return () => {
      listeners.delete(cb)
    }
  },
  update(resp: TrainsResponse) {
    const byId: Record<string, Train> = {}
    const present = new Set<string>()
    for (const t of resp.trains) {
      byId[t.id] = t
      present.add(t.id)
      const trail = trails.get(t.id)
      const prev = trail?.[trail.length - 1]
      if (prev && (Math.abs(prev[0] - t.lon) > 0.0002 || Math.abs(prev[1] - t.lat) > 0.0002)) {
        headings.set(t.id, bearingDeg(prev, [t.lon, t.lat]))
      }
      if (!trail) {
        trails.set(t.id, [[t.lon, t.lat]])
      } else if (prev && (Math.abs(prev[0] - t.lon) > 0.0002 || Math.abs(prev[1] - t.lat) > 0.0002)) {
        trail.push([t.lon, t.lat])
        if (trail.length > TRAIL_MAX) trail.shift()
      }
    }
    if (trails.size > 800) {
      for (const id of trails.keys())
        if (!present.has(id)) {
          trails.delete(id)
          headings.delete(id)
        }
    }
    snapshot = { trains: resp.trains, byId, source: resp.source, now: resp.now, updatedAt: Date.now() }
    emit()
  },
  headingFor(id: string): number {
    return headings.get(id) ?? 0
  },
  trailFor(id: string | null): [number, number][] {
    if (!id) return []
    return trails.get(id) ?? []
  },
}

export function useTrainSnapshot(): TrainSnapshot {
  return useSyncExternalStore(trainStore.subscribe, trainStore.getSnapshot)
}
