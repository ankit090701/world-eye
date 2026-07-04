import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import type { Feature, FeatureCollection } from 'geojson'
import { useMapContext } from '../MapContext'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { setActiveTool } from '../../store/uiSlice'
import { setDraftData } from '../mapLayers'
import { drawStore, useDrawFeatures } from '../../data/drawStore'
import {
  circleRing,
  formatArea,
  formatDistance,
  haversineMeters,
  pathLengthMeters,
  polygonAreaMeters,
  rectangleRing,
} from '../../lib/geo'
import type { ToolId } from '../../types'
import { Check, Undo2, X, Trash2 } from 'lucide-react'

const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] }
const PALETTE = ['#818cf8', '#22d3ee', '#34d399', '#f59e0b', '#f43f5e', '#a78bfa']

const isDrawTool = (t: ToolId) => t.startsWith('draw-')

const HINTS: Record<string, string> = {
  'draw-point': 'Click to drop points',
  'draw-line': 'Click to add points · double-click / Done to finish',
  'draw-polygon': 'Click to add vertices · double-click / Done to finish',
  'draw-rectangle': 'Click first corner, then the opposite corner',
  'draw-circle': 'Click the centre, then a point on the edge',
}

export default function DrawTool() {
  const { map } = useMapContext()
  const dispatch = useAppDispatch()
  const tool = useAppSelector((s) => s.ui.activeTool)
  const epoch = useAppSelector((s) => s.map.styleEpoch)
  const active = isDrawTool(tool)

  const [pts, setPts] = useState<[number, number][]>([])
  const [preview, setPreview] = useState<[number, number] | null>(null)

  // Subscribe to the draw store so the HUD (count + next-colour swatch) stays
  // live — including after "Delete all", which doesn't touch local state.
  const drawnCount = useDrawFeatures().features.length

  const ptsRef = useRef<[number, number][]>([])
  const toolRef = useRef<ToolId>(tool)
  useEffect(() => {
    ptsRef.current = pts
  }, [pts])
  useEffect(() => {
    toolRef.current = tool
  }, [tool])

  const nextColor = () => PALETTE[drawStore.count() % PALETTE.length]

  const commit = (feature: Feature) => {
    drawStore.add(feature)
    setPts([])
    setPreview(null)
  }

  const commitLineOrPolygon = () => {
    const cur = ptsRef.current
    const k = toolRef.current
    if (k === 'draw-line' && cur.length >= 2) {
      commit({
        type: 'Feature',
        properties: { color: nextColor(), kind: 'line' },
        geometry: { type: 'LineString', coordinates: cur },
      })
    } else if (k === 'draw-polygon' && cur.length >= 3) {
      commit({
        type: 'Feature',
        properties: { color: nextColor(), kind: 'polygon' },
        geometry: { type: 'Polygon', coordinates: [[...cur, cur[0]]] },
      })
    }
  }

  // Attach handlers while a draw tool is active.
  useEffect(() => {
    if (!map || !active) return
    const dcz = map.doubleClickZoom.isEnabled()
    map.doubleClickZoom.disable()

    const onClick = (e: maplibregl.MapMouseEvent) => {
      const ll: [number, number] = [e.lngLat.lng, e.lngLat.lat]
      const k = toolRef.current
      const cur = ptsRef.current
      if (k === 'draw-point') {
        commit({
          type: 'Feature',
          properties: { color: nextColor(), kind: 'point' },
          geometry: { type: 'Point', coordinates: ll },
        })
        return
      }
      if (k === 'draw-rectangle') {
        if (cur.length === 0) {
          setPts([ll])
        } else {
          commit({
            type: 'Feature',
            properties: { color: nextColor(), kind: 'rectangle' },
            geometry: { type: 'Polygon', coordinates: [rectangleRing(cur[0], ll)] },
          })
        }
        return
      }
      if (k === 'draw-circle') {
        if (cur.length === 0) {
          setPts([ll])
        } else {
          const radius = haversineMeters(cur[0], ll)
          commit({
            type: 'Feature',
            properties: { color: nextColor(), kind: 'circle', radiusMeters: radius },
            geometry: { type: 'Polygon', coordinates: [circleRing(cur[0], radius)] },
          })
        }
        return
      }
      // line / polygon
      setPts((prev) => [...prev, ll])
    }

    const onMove = (e: maplibregl.MapMouseEvent) => setPreview([e.lngLat.lng, e.lngLat.lat])
    const onDblClick = () => commitLineOrPolygon()
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Enter') commitLineOrPolygon()
      else if (ev.key === 'Escape') {
        setPts([])
        setPreview(null)
      } else if (ev.key === 'Backspace') setPts((prev) => prev.slice(0, -1))
    }

    map.on('click', onClick)
    map.on('mousemove', onMove)
    map.on('dblclick', onDblClick)
    window.addEventListener('keydown', onKey)
    map.getCanvas().style.cursor = 'crosshair'

    return () => {
      map.off('click', onClick)
      map.off('mousemove', onMove)
      map.off('dblclick', onDblClick)
      window.removeEventListener('keydown', onKey)
      map.getCanvas().style.cursor = ''
      if (dcz) map.doubleClickZoom.enable()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, active])

  // Reset draft when the tool changes / deactivates. Intentionally NOT keyed on
  // `epoch`: a basemap switch mid-draw must not discard the user's placed points
  // (the render effect below re-draws them after the style reloads).
  useEffect(() => {
    setPts([])
    setPreview(null)
    if (map && epoch > 0) setDraftData(map, EMPTY)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool, map])

  // Render the draft geometry.
  useEffect(() => {
    if (!map || !active || epoch === 0) return
    const features: Feature[] = []
    const k = tool

    if (k === 'draw-line' || k === 'draw-polygon') {
      const chain = preview ? [...pts, preview] : pts
      if (chain.length >= 2) {
        features.push({
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: chain },
        })
      }
      if (k === 'draw-polygon' && chain.length >= 3) {
        features.push({
          type: 'Feature',
          properties: {},
          geometry: { type: 'Polygon', coordinates: [[...chain, chain[0]]] },
        })
      }
      for (const p of pts) {
        features.push({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: p } })
      }
    } else if (k === 'draw-rectangle' && pts.length === 1 && preview) {
      features.push({
        type: 'Feature',
        properties: {},
        geometry: { type: 'Polygon', coordinates: [rectangleRing(pts[0], preview)] },
      })
      features.push({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: pts[0] } })
    } else if (k === 'draw-circle' && pts.length === 1 && preview) {
      const radius = haversineMeters(pts[0], preview)
      features.push({
        type: 'Feature',
        properties: {},
        geometry: { type: 'Polygon', coordinates: [circleRing(pts[0], radius)] },
      })
      features.push({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: pts[0] } })
    }
    setDraftData(map, { type: 'FeatureCollection', features })
  }, [map, active, epoch, tool, pts, preview])

  if (!active) return null

  // live measurement readout
  let readout = ''
  if (tool === 'draw-line') {
    const chain = preview ? [...pts, preview] : pts
    if (chain.length >= 2) readout = formatDistance(pathLengthMeters(chain))
  } else if (tool === 'draw-polygon') {
    if (pts.length >= 2) readout = formatArea(polygonAreaMeters(preview ? [...pts, preview] : pts))
  } else if (tool === 'draw-rectangle' && pts.length === 1 && preview) {
    readout = formatArea(polygonAreaMeters(rectangleRing(pts[0], preview)))
  } else if (tool === 'draw-circle' && pts.length === 1 && preview) {
    readout = `r = ${formatDistance(haversineMeters(pts[0], preview))}`
  }

  const canFinish =
    (tool === 'draw-line' && pts.length >= 2) || (tool === 'draw-polygon' && pts.length >= 3)

  return (
    <div className="pointer-events-auto absolute bottom-28 left-1/2 z-30 -translate-x-1/2 animate-fade-in">
      <div className="we-glass flex items-center gap-3 rounded-xl px-4 py-2.5 shadow-panel">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ background: PALETTE[drawnCount % PALETTE.length] }}
        />
        <div className="text-xs">
          <div className="text-we-text">
            {HINTS[tool]}
            {readout && <span className="ml-2 font-mono text-we-accent">{readout}</span>}
          </div>
          <div className="text-[10px] text-we-muted">
            {drawnCount} shape(s) · Esc cancels · Backspace undo
          </div>
        </div>
        <div className="ml-2 flex items-center gap-1">
          {canFinish && (
            <button
              onClick={commitLineOrPolygon}
              className="rounded-md p-1.5 text-we-good hover:bg-we-panel-2"
              title="Finish shape (Enter)"
            >
              <Check size={15} />
            </button>
          )}
          <button
            onClick={() => setPts((p) => p.slice(0, -1))}
            className="rounded-md p-1.5 text-we-muted hover:bg-we-panel-2 hover:text-we-text"
            title="Undo last vertex"
          >
            <Undo2 size={15} />
          </button>
          <button
            onClick={() => drawStore.clear()}
            className="rounded-md p-1.5 text-we-muted hover:bg-we-panel-2 hover:text-we-danger"
            title="Delete all drawings"
          >
            <Trash2 size={15} />
          </button>
          <button
            onClick={() => dispatch(setActiveTool('none'))}
            className="rounded-md p-1.5 text-we-muted hover:bg-we-panel-2 hover:text-we-danger"
            title="Close drawing tool"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}
