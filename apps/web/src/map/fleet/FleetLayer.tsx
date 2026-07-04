import { useEffect } from 'react'
import type maplibregl from 'maplibre-gl'
import type { Feature } from 'geojson'
import { useMapContext } from '../MapContext'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { openPanel } from '../../store/uiSlice'
import { fleetFeedError, fleetFeedOk, selectVehicle } from '../../store/fleetSlice'
import { fleetStore, useFleetSnapshot } from '../../data/fleetStore'
import { fetchFleet } from '../../api/fleetApi'
import { setFleetData, setFleetTrailData, setGeofenceData } from '../mapLayers'
import { LYR } from '../ids'
import { circleRing } from '../../lib/geo'

function useFleetEnabled(): boolean {
  return useAppSelector((s) => s.layers.items.find((l) => l.id === 'fleet')?.visible ?? false)
}

/** Polls the fleet telematics feed (non-viewport — the whole owned fleet). */
export function FleetEngine() {
  const dispatch = useAppDispatch()
  const enabled = useFleetEnabled()
  const depot = useAppSelector((s) => s.fleet.depot)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    let inFlight = false
    const poll = async () => {
      if (inFlight) return
      inFlight = true
      try {
        const resp = await fetchFleet(depot)
        if (cancelled) return
        fleetStore.update(resp)
        dispatch(
          fleetFeedOk({ count: resp.count, alertCount: resp.alerts.length, lastUpdated: Date.now() }),
        )
      } catch {
        if (!cancelled) dispatch(fleetFeedError('Fleet feed unavailable — is the WorldEye API running?'))
      } finally {
        inFlight = false
      }
    }
    poll()
    const id = window.setInterval(poll, 3000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [enabled, depot, dispatch])

  return null
}

export function FleetSync() {
  const { map } = useMapContext()
  const epoch = useAppSelector((s) => s.map.styleEpoch)
  const snap = useFleetSnapshot()
  const selectedId = useAppSelector((s) => s.fleet.selectedId)
  const statusFilter = useAppSelector((s) => s.fleet.statusFilter)
  const follow = useAppSelector((s) => s.fleet.follow)

  // vehicles
  useEffect(() => {
    if (!map || epoch === 0) return
    const list = statusFilter
      ? snap.vehicles.filter((v) => statusFilter.includes(v.status))
      : snap.vehicles
    const features: Feature[] = list.map((v) => ({
      type: 'Feature',
      properties: {
        id: v.id,
        status: v.status,
        heading: v.heading,
        moving: v.status === 'moving',
        selected: v.id === selectedId,
      },
      geometry: { type: 'Point', coordinates: [v.lon, v.lat] },
    }))
    setFleetData(map, { type: 'FeatureCollection', features })
  }, [map, epoch, snap, selectedId, statusFilter])

  // geofences (polygons)
  useEffect(() => {
    if (!map || epoch === 0) return
    const features: Feature[] = snap.geofences.map((g) => ({
      type: 'Feature',
      properties: { name: g.name, gtype: g.type, color: g.color },
      geometry: { type: 'Polygon', coordinates: [circleRing(g.center, g.radiusM)] },
    }))
    setGeofenceData(map, { type: 'FeatureCollection', features })
  }, [map, epoch, snap.geofences])

  // selected trail
  useEffect(() => {
    if (!map || epoch === 0) return
    const trail = fleetStore.trailFor(selectedId)
    const features: Feature[] =
      trail.length >= 2
        ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: trail } }]
        : []
    setFleetTrailData(map, { type: 'FeatureCollection', features })
  }, [map, epoch, snap, selectedId])

  // follow
  useEffect(() => {
    if (!map || !follow || !selectedId) return
    const v = snap.byId[selectedId]
    if (v) map.easeTo({ center: [v.lon, v.lat], duration: 900 })
  }, [map, follow, selectedId, snap])

  return null
}

export function FleetInteractions() {
  const { map } = useMapContext()
  const dispatch = useAppDispatch()
  const activeTool = useAppSelector((s) => s.ui.activeTool)

  useEffect(() => {
    if (!map || activeTool !== 'none') return
    const onClick = (e: maplibregl.MapLayerMouseEvent) => {
      const id = e.features?.[0]?.properties?.id
      if (id != null) {
        dispatch(selectVehicle(String(id)))
        dispatch(openPanel('fleet'))
      }
    }
    const onEnter = () => {
      map.getCanvas().style.cursor = 'pointer'
    }
    const onLeave = () => {
      map.getCanvas().style.cursor = ''
    }
    for (const layer of [LYR.fleetIcon, LYR.fleetHalo]) {
      map.on('click', layer, onClick)
      map.on('mouseenter', layer, onEnter)
      map.on('mouseleave', layer, onLeave)
    }
    return () => {
      for (const layer of [LYR.fleetIcon, LYR.fleetHalo]) {
        map.off('click', layer, onClick)
        map.off('mouseenter', layer, onEnter)
        map.off('mouseleave', layer, onLeave)
      }
    }
  }, [map, activeTool, dispatch])

  return null
}
