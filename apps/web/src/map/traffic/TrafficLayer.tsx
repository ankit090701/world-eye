import { useEffect } from 'react'
import maplibregl from 'maplibre-gl'
import type { Feature } from 'geojson'
import { useMapContext } from '../MapContext'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { openPanel } from '../../store/uiSlice'
import { selectIncident, trafficFeedError, trafficFeedOk } from '../../store/trafficSlice'
import { trafficStore, useTrafficSnapshot } from '../../data/trafficStore'
import { fetchTraffic } from '../../api/trafficApi'
import type { BBox } from '../../api/shipsApi'
import { setTrafficFlowData, setTrafficIncidentData } from '../mapLayers'
import { LYR } from '../ids'
import { CONGESTION_LABELS } from '../../config/trafficTypes'
import type { CongestionLevel } from '../../types'

const CONG_WEIGHT: Record<CongestionLevel, number> = { free: 0.12, moderate: 0.5, heavy: 1, unknown: 0.2 }

function useTrafficEnabled(): boolean {
  return useAppSelector(
    (s) =>
      (s.layers.items.find((l) => l.id === 'traffic-incidents')?.visible ?? false) ||
      (s.layers.items.find((l) => l.id === 'traffic-flow')?.visible ?? false),
  )
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

export function TrafficEngine() {
  const { map } = useMapContext()
  const dispatch = useAppDispatch()
  const enabled = useTrafficEnabled()

  useEffect(() => {
    if (!map || !enabled) return
    let cancelled = false
    let inFlight = false
    let moveTimer = 0

    const poll = async () => {
      if (inFlight) return
      inFlight = true
      try {
        const resp = await fetchTraffic(viewportBBox(map))
        if (cancelled) return
        trafficStore.update(resp)
        dispatch(
          trafficFeedOk({
            source: resp.source,
            incidentCount: resp.incidents.length,
            flowCount: resp.flow.length,
            lastUpdated: Date.now(),
          }),
        )
      } catch {
        if (!cancelled) dispatch(trafficFeedError('Traffic feed unavailable — is the WorldEye API running?'))
      } finally {
        inFlight = false
      }
    }

    poll()
    const id = window.setInterval(poll, 20000)
    const onMoveEnd = (e: maplibregl.MapLibreEvent & { originalEvent?: unknown }) => {
      if (!e.originalEvent) return
      window.clearTimeout(moveTimer)
      moveTimer = window.setTimeout(poll, 1400)
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

export function TrafficSync() {
  const { map } = useMapContext()
  const epoch = useAppSelector((s) => s.map.styleEpoch)
  const snap = useTrafficSnapshot()
  const selectedIncidentId = useAppSelector((s) => s.traffic.selectedIncidentId)
  const typeFilter = useAppSelector((s) => s.traffic.typeFilter)

  useEffect(() => {
    if (!map || epoch === 0) return
    const list = typeFilter ? snap.incidents.filter((i) => typeFilter.includes(i.type)) : snap.incidents
    const features: Feature[] = list.map((i) => ({
      type: 'Feature',
      properties: { id: i.id, itype: i.type, severity: i.severity, selected: i.id === selectedIncidentId },
      geometry: { type: 'Point', coordinates: [i.lon, i.lat] },
    }))
    setTrafficIncidentData(map, { type: 'FeatureCollection', features })
  }, [map, epoch, snap.incidents, selectedIncidentId, typeFilter])

  useEffect(() => {
    if (!map || epoch === 0) return
    const features: Feature[] = snap.flow.map((f) => ({
      type: 'Feature',
      properties: { congestion: f.congestion, cong: CONG_WEIGHT[f.congestion], volume: f.volume },
      geometry: { type: 'Point', coordinates: [f.lon, f.lat] },
    }))
    setTrafficFlowData(map, { type: 'FeatureCollection', features })
  }, [map, epoch, snap.flow])

  return null
}

export function TrafficInteractions() {
  const { map } = useMapContext()
  const dispatch = useAppDispatch()
  const activeTool = useAppSelector((s) => s.ui.activeTool)

  useEffect(() => {
    if (!map || activeTool !== 'none') return
    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: true, offset: 10 })

    const onIncidentClick = (e: maplibregl.MapLayerMouseEvent) => {
      const id = e.features?.[0]?.properties?.id
      if (id != null) {
        dispatch(selectIncident(String(id)))
        dispatch(openPanel('traffic'))
      }
    }
    const onFlowClick = (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0]
      if (!f || f.geometry.type !== 'Point') return
      const p = f.properties || {}
      const [lng, lat] = f.geometry.coordinates as [number, number]
      const cong = String(p.congestion ?? 'unknown') as CongestionLevel
      popup
        .setLngLat([lng, lat])
        .setHTML(
          `<div style="font-size:11px"><strong>${CONGESTION_LABELS[cong]}</strong><br/>${p.volume ?? '—'} veh/h</div>`,
        )
        .addTo(map)
    }
    const onEnter = () => {
      map.getCanvas().style.cursor = 'pointer'
    }
    const onLeave = () => {
      map.getCanvas().style.cursor = ''
    }
    map.on('click', LYR.trafficIncidents, onIncidentClick)
    map.on('click', LYR.trafficFlow, onFlowClick)
    for (const layer of [LYR.trafficIncidents, LYR.trafficFlow]) {
      map.on('mouseenter', layer, onEnter)
      map.on('mouseleave', layer, onLeave)
    }
    return () => {
      map.off('click', LYR.trafficIncidents, onIncidentClick)
      map.off('click', LYR.trafficFlow, onFlowClick)
      for (const layer of [LYR.trafficIncidents, LYR.trafficFlow]) {
        map.off('mouseenter', layer, onEnter)
        map.off('mouseleave', layer, onLeave)
      }
      popup.remove()
    }
  }, [map, activeTool, dispatch])

  return null
}
