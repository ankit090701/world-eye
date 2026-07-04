import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import type { Feature, FeatureCollection } from 'geojson'
import { useMapContext } from './MapContext'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { getBasemapStyle } from '../config/basemaps'
import { applyLayerStates, setActivityData, setDrawData } from './mapLayers'
import { LYR } from './ids'
import { useVisibleSignals } from '../hooks/useVisibleSignals'
import { useDrawFeatures } from '../data/drawStore'
import { activityStore } from '../data/activityStore'
import { advancePlayback, liveTick } from '../store/timelineSlice'
import { CATEGORY_COLORS } from '../data/activitySimulator'

/** Switches the base style when the basemap selection changes. */
export function BasemapSync() {
  const { map } = useMapContext()
  const basemap = useAppSelector((s) => s.map.basemap)
  // Initialised to the basemap that was already applied at map construction, so
  // we only call setStyle when the selection actually changes (also avoids a
  // redundant reload on StrictMode remounts).
  const applied = useRef(basemap)
  useEffect(() => {
    if (!map) return
    if (applied.current === basemap) return
    applied.current = basemap
    map.setStyle(getBasemapStyle(basemap) as any)
    // MapView's persistent 'style.load' handler reinstalls overlays + bumps epoch,
    // which triggers the other syncers to re-apply their data & visibility.
  }, [map, basemap])
  return null
}

/** Applies globe / mercator projection (re-applied on every style load). */
export function ProjectionSync() {
  const { map } = useMapContext()
  const projection = useAppSelector((s) => s.map.projection)
  const epoch = useAppSelector((s) => s.map.styleEpoch)
  useEffect(() => {
    if (!map || epoch === 0) return
    try {
      map.setProjection({ type: projection })
    } catch {
      /* older renderers may not support globe; ignore */
    }
  }, [map, projection, epoch])
  return null
}

/** Pushes Layer Controls state (visibility + opacity) to the map. */
export function LayerVisibilitySync() {
  const { map } = useMapContext()
  const layers = useAppSelector((s) => s.layers.items)
  const epoch = useAppSelector((s) => s.map.styleEpoch)
  useEffect(() => {
    if (!map || epoch === 0) return
    applyLayerStates(map, layers)
  }, [map, layers, epoch])
  return null
}

/** Rebuilds the activity GeoJSON for the current timeline window. */
export function ActivitySync() {
  const { map } = useMapContext()
  const epoch = useAppSelector((s) => s.map.styleEpoch)
  const signals = useVisibleSignals()
  useEffect(() => {
    if (!map || epoch === 0) return
    const features: Feature[] = signals.map((s) => ({
      type: 'Feature',
      properties: {
        id: s.id,
        category: s.category,
        intensity: s.intensity,
        label: s.label,
        place: s.place,
        ts: s.timestamp,
      },
      geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
    }))
    setActivityData(map, { type: 'FeatureCollection', features })
  }, [map, epoch, signals])
  return null
}

/** Keeps committed drawings in sync (survives basemap style reloads). */
export function DrawSync() {
  const { map } = useMapContext()
  const epoch = useAppSelector((s) => s.map.styleEpoch)
  const features = useDrawFeatures()
  useEffect(() => {
    if (!map || epoch === 0) return
    setDrawData(map, features)
  }, [map, epoch, features])
  return null
}

/** Drives the live clock + historical playback intervals. */
export function TimelineEngine() {
  const dispatch = useAppDispatch()
  const mode = useAppSelector((s) => s.timeline.mode)
  const playing = useAppSelector((s) => s.timeline.playing)
  const speed = useAppSelector((s) => s.timeline.speed)

  // Live clock: roll the window forward and inject fresh signals.
  useEffect(() => {
    if (mode !== 'live') return
    const id = window.setInterval(() => {
      const now = Date.now()
      dispatch(liveTick(now))
      activityStore.addLive(now, 1 + Math.floor(Math.random() * 3))
    }, 1500)
    return () => window.clearInterval(id)
  }, [mode, dispatch])

  // Historical playback: advance the playhead.
  useEffect(() => {
    if (mode === 'live' || !playing) return
    const stepMs = 200
    const id = window.setInterval(() => {
      dispatch(advancePlayback(stepMs * speed))
    }, stepMs)
    return () => window.clearInterval(id)
  }, [mode, playing, speed, dispatch])

  return null
}

/** Click / hover popups for activity points (disabled while a tool is active). */
export function ActivityInteractions() {
  const { map } = useMapContext()
  const activeTool = useAppSelector((s) => s.ui.activeTool)
  useEffect(() => {
    if (!map || activeTool !== 'none') return
    const popup = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: true,
      offset: 12,
      maxWidth: '260px',
    })
    const onClick = (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0]
      if (!f || f.geometry.type !== 'Point') return
      const p = f.properties || {}
      const [lng, lat] = f.geometry.coordinates as [number, number]
      const cat = String(p.category ?? 'signal')
      const color = (CATEGORY_COLORS as Record<string, string>)[cat] ?? '#22d3ee'
      const when = new Date(Number(p.ts)).toLocaleString()
      popup
        .setLngLat([lng, lat])
        .setHTML(
          `<div style="min-width:180px">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
              <span style="width:9px;height:9px;border-radius:50%;background:${color};display:inline-block"></span>
              <strong style="text-transform:uppercase;font-size:11px;letter-spacing:.04em">${cat}</strong>
            </div>
            <div style="color:#94a3b8;font-size:11px">${p.place ?? ''}</div>
            <div style="font-family:ui-monospace,monospace;font-size:11px;margin-top:4px">${lat.toFixed(4)}, ${lng.toFixed(4)}</div>
            <div style="color:#64748b;font-size:10px;margin-top:4px">${when}</div>
            <div style="color:#475569;font-size:10px;margin-top:6px">Demo signal · placeholder feed</div>
          </div>`,
        )
        .addTo(map)
    }
    const onEnter = () => {
      map.getCanvas().style.cursor = 'pointer'
    }
    const onLeave = () => {
      map.getCanvas().style.cursor = ''
    }
    map.on('click', LYR.points, onClick)
    map.on('mouseenter', LYR.points, onEnter)
    map.on('mouseleave', LYR.points, onLeave)
    return () => {
      map.off('click', LYR.points, onClick)
      map.off('mouseenter', LYR.points, onEnter)
      map.off('mouseleave', LYR.points, onLeave)
      popup.remove()
    }
  }, [map, activeTool])
  return null
}

const _emptyFC: FeatureCollection = { type: 'FeatureCollection', features: [] }
export { _emptyFC }
