import { useSyncExternalStore } from 'react'
import type { FleetAlert, FleetResponse, Geofence, Vehicle } from '../types'

export interface FleetSnapshot {
  vehicles: Vehicle[]
  byId: Record<string, Vehicle>
  geofences: Geofence[]
  alerts: FleetAlert[]
  now: number
  updatedAt: number
}

const EMPTY: FleetSnapshot = {
  vehicles: [],
  byId: {},
  geofences: [],
  alerts: [],
  now: 0,
  updatedAt: 0,
}

let snapshot: FleetSnapshot = EMPTY
const trails = new Map<string, [number, number][]>()
const TRAIL_MAX = 60
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

export const fleetStore = {
  getSnapshot(): FleetSnapshot {
    return snapshot
  },
  subscribe(cb: () => void): () => void {
    listeners.add(cb)
    return () => {
      listeners.delete(cb)
    }
  },
  update(resp: FleetResponse) {
    const byId: Record<string, Vehicle> = {}
    for (const v of resp.vehicles) {
      byId[v.id] = v
      if (v.status === 'moving') {
        const trail = trails.get(v.id)
        if (!trail) trails.set(v.id, [[v.lon, v.lat]])
        else {
          const last = trail[trail.length - 1]
          if (Math.abs(last[0] - v.lon) > 0.0002 || Math.abs(last[1] - v.lat) > 0.0002) {
            trail.push([v.lon, v.lat])
            if (trail.length > TRAIL_MAX) trail.shift()
          }
        }
      }
    }
    snapshot = {
      vehicles: resp.vehicles,
      byId,
      geofences: resp.geofences,
      alerts: resp.alerts,
      now: resp.now,
      updatedAt: Date.now(),
    }
    emit()
  },
  trailFor(id: string | null): [number, number][] {
    if (!id) return []
    return trails.get(id) ?? []
  },
}

export function useFleetSnapshot(): FleetSnapshot {
  return useSyncExternalStore(fleetStore.subscribe, fleetStore.getSnapshot)
}
