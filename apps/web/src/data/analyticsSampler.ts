import { useSyncExternalStore } from 'react'
import { gatherContext } from '../lib/aiEngine'

export interface TrendSample {
  t: number
  total: number // aircraft + ships + trains + fleet
  aircraft: number
  ships: number
  threats: number
  quakes: number
}

interface TrendSnapshot {
  series: TrendSample[]
}

const MAX = 120
let snap: TrendSnapshot = { series: [] }
const listeners = new Set<() => void>()

export const trendStore = {
  getSnapshot: (): TrendSnapshot => snap,
  subscribe(cb: () => void): () => void {
    listeners.add(cb)
    return () => {
      listeners.delete(cb)
    }
  },
  sample() {
    const c = gatherContext()
    const s: TrendSample = {
      t: Date.now(),
      aircraft: c.aircraft.count,
      ships: c.ships.count,
      threats: c.cyber.threats,
      quakes: c.weather.quakes.length,
      total: c.aircraft.count + c.ships.count + c.trains.count + c.fleet.count,
    }
    snap = { series: [...snap.series, s].slice(-MAX) }
    for (const l of listeners) l()
  },
}

export function useTrend(): TrendSnapshot {
  return useSyncExternalStore(trendStore.subscribe, trendStore.getSnapshot)
}
