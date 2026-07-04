import { useEffect } from 'react'
import type maplibregl from 'maplibre-gl'
import type { Feature } from 'geojson'
import { useMapContext } from '../MapContext'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { openPanel } from '../../store/uiSlice'
import { selectShip, shipFeedError, shipFeedOk } from '../../store/shipSlice'
import { shipStore, useShipSnapshot } from '../../data/shipStore'
import { fetchShips, type BBox } from '../../api/shipsApi'
import { setShipData, setShipTrailData } from '../mapLayers'
import { LYR } from '../ids'

function useShipsEnabled(): boolean {
  return useAppSelector((s) => s.layers.items.find((l) => l.id === 'ships')?.visible ?? false)
}

function viewportBBox(map: maplibregl.Map): BBox {
  const b = map.getBounds()
  let minLon = b.getWest()
  let maxLon = b.getEast()
  let minLat = Math.max(-85, b.getSouth())
  let maxLat = Math.min(85, b.getNorth())
  if (minLon < -180 || maxLon > 180 || maxLon - minLon > 340 || minLon > maxLon) {
    minLon = -180
    maxLon = 180
  }
  if (minLat > maxLat) {
    minLat = -85
    maxLat = 85
  }
  return { minLon, minLat, maxLon, maxLat }
}

/** Polls the WorldEye API for ships in the current viewport bbox. */
export function ShipEngine() {
  const { map } = useMapContext()
  const dispatch = useAppDispatch()
  const enabled = useShipsEnabled()

  useEffect(() => {
    if (!map || !enabled) return
    let cancelled = false
    let inFlight = false
    let moveTimer = 0

    const poll = async () => {
      if (inFlight) return
      inFlight = true
      try {
        const resp = await fetchShips(viewportBBox(map))
        if (cancelled) return
        shipStore.update(resp)
        dispatch(shipFeedOk({ source: resp.source, count: resp.count, lastUpdated: Date.now() }))
      } catch {
        if (!cancelled) dispatch(shipFeedError('Ship feed unavailable — is the WorldEye API running?'))
      } finally {
        inFlight = false
      }
    }

    poll()
    const id = window.setInterval(poll, 15000)
    const onMoveEnd = (e: maplibregl.MapLibreEvent & { originalEvent?: unknown }) => {
      if (!e.originalEvent) return // ignore programmatic (follow / flyTo) moves
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

/** Renders ship points + selected trail; follows the selected ship. */
export function ShipSync() {
  const { map } = useMapContext()
  const epoch = useAppSelector((s) => s.map.styleEpoch)
  const snap = useShipSnapshot()
  const selectedMmsi = useAppSelector((s) => s.ship.selectedMmsi)
  const categoryFilter = useAppSelector((s) => s.ship.categoryFilter)
  const follow = useAppSelector((s) => s.ship.follow)

  useEffect(() => {
    if (!map || epoch === 0) return
    const list = categoryFilter
      ? snap.ships.filter((s) => categoryFilter.includes(s.category))
      : snap.ships
    const features: Feature[] = list.map((s) => ({
      type: 'Feature',
      properties: {
        mmsi: s.mmsi,
        category: s.category,
        course: s.heading ?? s.cog ?? 0,
        moored: s.navStat === 5 || s.navStat === 1,
        selected: s.mmsi === selectedMmsi,
      },
      geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
    }))
    setShipData(map, { type: 'FeatureCollection', features })
  }, [map, epoch, snap, selectedMmsi, categoryFilter])

  useEffect(() => {
    if (!map || epoch === 0) return
    const trail = shipStore.trailFor(selectedMmsi)
    const features: Feature[] =
      trail.length >= 2
        ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: trail } }]
        : []
    setShipTrailData(map, { type: 'FeatureCollection', features })
  }, [map, epoch, snap, selectedMmsi])

  useEffect(() => {
    if (!map || !follow || selectedMmsi == null) return
    const s = snap.byMmsi[selectedMmsi]
    if (s) map.easeTo({ center: [s.lon, s.lat], duration: 900 })
  }, [map, follow, selectedMmsi, snap])

  return null
}

/** Click to select a ship; pointer cursor on hover. */
export function ShipInteractions() {
  const { map } = useMapContext()
  const dispatch = useAppDispatch()
  const activeTool = useAppSelector((s) => s.ui.activeTool)

  useEffect(() => {
    if (!map || activeTool !== 'none') return
    const onClick = (e: maplibregl.MapLayerMouseEvent) => {
      const mmsi = e.features?.[0]?.properties?.mmsi
      if (mmsi != null) {
        dispatch(selectShip(Number(mmsi)))
        dispatch(openPanel('ships'))
      }
    }
    const onEnter = () => {
      map.getCanvas().style.cursor = 'pointer'
    }
    const onLeave = () => {
      map.getCanvas().style.cursor = ''
    }
    for (const layer of [LYR.shipsIcon, LYR.shipsHalo]) {
      map.on('click', layer, onClick)
      map.on('mouseenter', layer, onEnter)
      map.on('mouseleave', layer, onLeave)
    }
    return () => {
      for (const layer of [LYR.shipsIcon, LYR.shipsHalo]) {
        map.off('click', layer, onClick)
        map.off('mouseenter', layer, onEnter)
        map.off('mouseleave', layer, onLeave)
      }
    }
  }, [map, activeTool, dispatch])

  return null
}
