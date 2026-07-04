import { useSyncExternalStore } from 'react'
import type { Feature, FeatureCollection } from 'geojson'

// External store for committed user-drawn features (persists across basemap
// style reloads, which recreate map sources).

const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] }

let collection: FeatureCollection = EMPTY
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

export const drawStore = {
  getSnapshot(): FeatureCollection {
    return collection
  },
  subscribe(cb: () => void): () => void {
    listeners.add(cb)
    return () => {
      listeners.delete(cb)
    }
  },
  add(feature: Feature) {
    collection = {
      type: 'FeatureCollection',
      features: [...collection.features, feature],
    }
    emit()
  },
  removeLast() {
    if (collection.features.length === 0) return
    collection = {
      type: 'FeatureCollection',
      features: collection.features.slice(0, -1),
    }
    emit()
  },
  clear() {
    if (collection.features.length === 0) return
    collection = EMPTY
    emit()
  },
  count() {
    return collection.features.length
  },
}

export function useDrawFeatures(): FeatureCollection {
  return useSyncExternalStore(drawStore.subscribe, drawStore.getSnapshot)
}
