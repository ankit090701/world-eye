import { useSyncExternalStore } from 'react'
import type { Cyclone, Earthquake, GridPoint, Wildfire } from '../types'

// ---- grid (temperature / wind / lightning field) ----
export interface GridSnapshot {
  points: GridPoint[]
  source: 'live' | 'sim' | null
  updatedAt: number
}
const GRID_EMPTY: GridSnapshot = { points: [], source: null, updatedAt: 0 }
let gridSnap: GridSnapshot = GRID_EMPTY
const gridListeners = new Set<() => void>()

export const weatherGridStore = {
  getSnapshot: (): GridSnapshot => gridSnap,
  subscribe(cb: () => void): () => void {
    gridListeners.add(cb)
    return () => gridListeners.delete(cb)
  },
  update(points: GridPoint[], source: 'live' | 'sim') {
    gridSnap = { points, source, updatedAt: Date.now() }
    for (const l of gridListeners) l()
  },
}
export function useWeatherGrid(): GridSnapshot {
  return useSyncExternalStore(weatherGridStore.subscribe, weatherGridStore.getSnapshot)
}

// ---- events (cyclones / wildfires / earthquakes) ----
export interface EventsSnapshot {
  cyclones: Cyclone[]
  wildfires: Wildfire[]
  earthquakes: Earthquake[]
  cycloneSource: 'live' | 'sim' | null
  updatedAt: number
}
const EVENTS_EMPTY: EventsSnapshot = {
  cyclones: [],
  wildfires: [],
  earthquakes: [],
  cycloneSource: null,
  updatedAt: 0,
}
let eventsSnap: EventsSnapshot = EVENTS_EMPTY
const eventsListeners = new Set<() => void>()

export const weatherEventsStore = {
  getSnapshot: (): EventsSnapshot => eventsSnap,
  subscribe(cb: () => void): () => void {
    eventsListeners.add(cb)
    return () => eventsListeners.delete(cb)
  },
  update(next: Omit<EventsSnapshot, 'updatedAt'>) {
    eventsSnap = { ...next, updatedAt: Date.now() }
    for (const l of eventsListeners) l()
  },
}
export function useWeatherEvents(): EventsSnapshot {
  return useSyncExternalStore(weatherEventsStore.subscribe, weatherEventsStore.getSnapshot)
}
