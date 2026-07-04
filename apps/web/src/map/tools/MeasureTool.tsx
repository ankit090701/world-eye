import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import type { Feature, FeatureCollection } from 'geojson'
import { useMapContext } from '../MapContext'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { setActiveTool } from '../../store/uiSlice'
import { setMeasureData } from '../mapLayers'
import { formatArea, formatDistance, pathLengthMeters, polygonAreaMeters } from '../../lib/geo'
import { Ruler, Undo2, X, Trash2 } from 'lucide-react'

const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] }

export default function MeasureTool() {
  const { map } = useMapContext()
  const dispatch = useAppDispatch()
  const active = useAppSelector((s) => s.ui.activeTool) === 'measure'
  const epoch = useAppSelector((s) => s.map.styleEpoch)
  const [pts, setPts] = useState<[number, number][]>([])
  const [preview, setPreview] = useState<[number, number] | null>(null)
  const labelRef = useRef<maplibregl.Marker | null>(null)

  // Attach / detach map handlers when the tool activates.
  useEffect(() => {
    if (!map || !active) return
    const dcz = map.doubleClickZoom.isEnabled()
    map.doubleClickZoom.disable()

    const onClick = (e: maplibregl.MapMouseEvent) => {
      setPts((prev) => [...prev, [e.lngLat.lng, e.lngLat.lat]])
    }
    const onMove = (e: maplibregl.MapMouseEvent) => {
      setPreview([e.lngLat.lng, e.lngLat.lat])
    }
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        setPts([])
        setPreview(null)
      } else if (ev.key === 'Backspace') {
        setPts((prev) => prev.slice(0, -1))
      }
    }
    map.on('click', onClick)
    map.on('mousemove', onMove)
    window.addEventListener('keydown', onKey)
    map.getCanvas().style.cursor = 'crosshair'

    return () => {
      map.off('click', onClick)
      map.off('mousemove', onMove)
      window.removeEventListener('keydown', onKey)
      map.getCanvas().style.cursor = ''
      if (dcz) map.doubleClickZoom.enable()
    }
  }, [map, active])

  // Reset when deactivated.
  useEffect(() => {
    if (active) return
    setPts([])
    setPreview(null)
    if (map) setMeasureData(map, EMPTY)
    labelRef.current?.remove()
    labelRef.current = null
  }, [active, map])

  // Render graphics from pts + preview.
  useEffect(() => {
    if (!map || !active || epoch === 0) return
    const line = preview ? [...pts, preview] : pts
    const features: Feature[] = []
    if (line.length >= 2) {
      features.push({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: line },
      })
    }
    for (const p of pts) {
      features.push({
        type: 'Feature',
        properties: {},
        geometry: { type: 'Point', coordinates: p },
      })
    }
    setMeasureData(map, { type: 'FeatureCollection', features })

    // running total label at the last point
    const distance = pathLengthMeters(line)
    const anchor = line[line.length - 1]
    if (anchor && line.length >= 2) {
      const el = document.createElement('div')
      el.className = 'we-measure-label'
      el.textContent = formatDistance(distance)
      if (!labelRef.current) {
        labelRef.current = new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat(anchor)
          .addTo(map)
      } else {
        labelRef.current.getElement().textContent = formatDistance(distance)
        labelRef.current.setLngLat(anchor)
      }
    } else {
      labelRef.current?.remove()
      labelRef.current = null
    }
  }, [map, active, epoch, pts, preview])

  if (!active) return null

  const line = preview ? [...pts, preview] : pts
  const distance = pathLengthMeters(line)
  const area = pts.length >= 3 ? polygonAreaMeters(pts) : 0

  return (
    <div className="pointer-events-auto absolute bottom-28 left-1/2 z-30 -translate-x-1/2 animate-fade-in">
      <div className="we-glass flex items-center gap-3 rounded-xl px-4 py-2.5 shadow-panel">
        <Ruler size={16} className="text-we-accent" />
        <div className="text-xs">
          <div className="font-mono text-we-text">
            {line.length >= 2 ? formatDistance(distance) : 'Click to add points'}
            {area > 0 && <span className="text-we-muted"> · {formatArea(area)}</span>}
          </div>
          <div className="text-[10px] text-we-muted">
            {pts.length} pts · click to add · Backspace to undo · Esc to reset
          </div>
        </div>
        <div className="ml-2 flex items-center gap-1">
          <button
            onClick={() => setPts((p) => p.slice(0, -1))}
            className="rounded-md p-1.5 text-we-muted hover:bg-we-panel-2 hover:text-we-text"
            title="Undo last point"
          >
            <Undo2 size={15} />
          </button>
          <button
            onClick={() => {
              setPts([])
              setPreview(null)
            }}
            className="rounded-md p-1.5 text-we-muted hover:bg-we-panel-2 hover:text-we-text"
            title="Clear"
          >
            <Trash2 size={15} />
          </button>
          <button
            onClick={() => dispatch(setActiveTool('none'))}
            className="rounded-md p-1.5 text-we-muted hover:bg-we-panel-2 hover:text-we-danger"
            title="Close measure tool"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}
