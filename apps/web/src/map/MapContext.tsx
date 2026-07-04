import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Map as MlMap } from 'maplibre-gl'

interface MapContextValue {
  map: MlMap | null
  setMap: (m: MlMap | null) => void
  ready: boolean
  setReady: (b: boolean) => void
}

const MapContext = createContext<MapContextValue | null>(null)

export function MapProvider({ children }: { children: ReactNode }) {
  const [map, setMap] = useState<MlMap | null>(null)
  const [ready, setReady] = useState(false)
  const value = useMemo(() => ({ map, setMap, ready, setReady }), [map, ready])
  return <MapContext.Provider value={value}>{children}</MapContext.Provider>
}

export function useMapContext(): MapContextValue {
  const ctx = useContext(MapContext)
  if (!ctx) throw new Error('useMapContext must be used within <MapProvider>')
  return ctx
}
