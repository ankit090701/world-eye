import { useEffect } from 'react'
import type maplibregl from 'maplibre-gl'
import type { Feature, FeatureCollection } from 'geojson'
import { useMapContext } from '../MapContext'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { openPanel } from '../../store/uiSlice'
import { feedError, feedOk, selectAircraft } from '../../store/aircraftSlice'
import { aircraftStore, useAircraftSnapshot } from '../../data/aircraftStore'
import { fetchAircraft } from '../../api/aircraftApi'
import { setAircraftData, setAircraftTrailData } from '../mapLayers'
import { LYR } from '../ids'
import { haversineMeters } from '../../lib/geo'

function useAircraftEnabled(): boolean {
  return useAppSelector((s) => s.layers.items.find((l) => l.id === 'aircraft')?.visible ?? false)
}

/** Polls the WorldEye API for aircraft in the current viewport. */
export function AircraftEngine() {
  const { map } = useMapContext()
  const dispatch = useAppDispatch()
  const enabled = useAircraftEnabled()

  useEffect(() => {
    if (!map || !enabled) return
    let cancelled = false
    let inFlight = false
    let moveTimer = 0

    const poll = async () => {
      if (inFlight) return
      inFlight = true
      try {
        const c = map.getCenter()
        const ne = map.getBounds().getNorthEast()
        const radiusNm = Math.min(
          250,
          Math.max(25, haversineMeters([c.lng, c.lat], [ne.lng, ne.lat]) / 1852),
        )
        const resp = await fetchAircraft(c.lat, c.lng, radiusNm)
        if (cancelled) return
        aircraftStore.update(resp)
        dispatch(feedOk({ source: resp.source, count: resp.count, lastUpdated: Date.now() }))
      } catch {
        if (!cancelled) dispatch(feedError('Aircraft feed unavailable — is the WorldEye API running?'))
      } finally {
        inFlight = false
      }
    }

    poll()
    const id = window.setInterval(poll, 10000)
    // Only refetch after a *user-driven* move (pan/zoom). Programmatic moves
    // (follow easeTo, flyTo) have no originalEvent — ignoring them prevents a
    // follow → moveend → poll feedback loop.
    const onMoveEnd = (e: maplibregl.MapLibreEvent & { originalEvent?: unknown }) => {
      if (!e.originalEvent) return
      window.clearTimeout(moveTimer)
      moveTimer = window.setTimeout(poll, 1200)
    }
    map.on('moveend', onMoveEnd)

    return () => {
      cancelled = true
      window.clearInterval(id)
      window.clearTimeout(moveTimer)
      map.off('moveend', onMoveEnd)
    }
  }, [map, enabled, dispatch])

  return null
}

/** Renders aircraft points + selected trail; follows the selected aircraft. */
export function AircraftSync() {
  const { map } = useMapContext()
  const epoch = useAppSelector((s) => s.map.styleEpoch)
  const snap = useAircraftSnapshot()
  const selectedHex = useAppSelector((s) => s.aircraft.selectedHex)
  const emergencyOnly = useAppSelector((s) => s.aircraft.emergencyOnly)
  const follow = useAppSelector((s) => s.aircraft.follow)

  useEffect(() => {
    if (!map || epoch === 0) return
    const list = emergencyOnly ? snap.aircraft.filter((a) => a.emergency) : snap.aircraft
    const features: Feature[] = list.map((a) => ({
      type: 'Feature',
      properties: {
        hex: a.hex,
        callsign: a.callsign ?? a.hex.toUpperCase(),
        alt: a.altitude ?? 0,
        track: a.track ?? 0,
        emergency: a.emergency,
        onGround: a.onGround,
        selected: a.hex === selectedHex,
      },
      geometry: { type: 'Point', coordinates: [a.lon, a.lat] },
    }))
    setAircraftData(map, { type: 'FeatureCollection', features })
  }, [map, epoch, snap, selectedHex, emergencyOnly])

  // selected aircraft trail (observed positions)
  useEffect(() => {
    if (!map || epoch === 0) return
    const trail = aircraftStore.trailFor(selectedHex)
    const features: Feature[] =
      trail.length >= 2
        ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: trail } }]
        : []
    setAircraftTrailData(map, { type: 'FeatureCollection', features } as FeatureCollection)
  }, [map, epoch, snap, selectedHex])

  // follow mode
  useEffect(() => {
    if (!map || !follow || !selectedHex) return
    const a = snap.byHex[selectedHex]
    if (a) map.easeTo({ center: [a.lon, a.lat], duration: 900 })
  }, [map, follow, selectedHex, snap])

  return null
}

/** Click to select an aircraft; pointer cursor on hover. */
export function AircraftInteractions() {
  const { map } = useMapContext()
  const dispatch = useAppDispatch()
  const activeTool = useAppSelector((s) => s.ui.activeTool)

  useEffect(() => {
    if (!map || activeTool !== 'none') return
    const onClick = (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0]
      const hex = f?.properties?.hex
      if (hex) {
        dispatch(selectAircraft(String(hex)))
        dispatch(openPanel('aircraft'))
      }
    }
    const onEnter = () => {
      map.getCanvas().style.cursor = 'pointer'
    }
    const onLeave = () => {
      map.getCanvas().style.cursor = ''
    }
    for (const layer of [LYR.aircraftIcon, LYR.aircraftHalo]) {
      map.on('click', layer, onClick)
      map.on('mouseenter', layer, onEnter)
      map.on('mouseleave', layer, onLeave)
    }
    return () => {
      for (const layer of [LYR.aircraftIcon, LYR.aircraftHalo]) {
        map.off('click', layer, onClick)
        map.off('mouseenter', layer, onEnter)
        map.off('mouseleave', layer, onLeave)
      }
    }
  }, [map, activeTool, dispatch])

  return null
}
