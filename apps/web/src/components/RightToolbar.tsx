import { useState } from 'react'
import {
  Ruler,
  PencilRuler,
  MapPin,
  Spline,
  Hexagon,
  Square,
  Circle,
  Globe2,
  Map as MapIcon,
  Compass,
  Shrink,
  Camera,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { setActiveTool, setToast } from '../store/uiSlice'
import { toggleProjection } from '../store/mapSlice'
import { useMapContext } from '../map/MapContext'
import { exportMapImage } from '../lib/exportImage'
import type { ToolId } from '../types'
import { cx } from '../lib/cx'

const DRAW_ITEMS: { id: ToolId; label: string; icon: LucideIcon }[] = [
  { id: 'draw-point', label: 'Point', icon: MapPin },
  { id: 'draw-line', label: 'Line', icon: Spline },
  { id: 'draw-polygon', label: 'Polygon', icon: Hexagon },
  { id: 'draw-rectangle', label: 'Rectangle', icon: Square },
  { id: 'draw-circle', label: 'Circle', icon: Circle },
]

function ToolButton({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean
  onClick: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cx(
        'flex h-10 w-10 items-center justify-center rounded-lg border transition-colors',
        active
          ? 'border-we-accent/70 bg-we-accent/15 text-we-accent shadow-glow'
          : 'we-glass border-we-border text-we-muted hover:text-we-text',
      )}
    >
      {children}
    </button>
  )
}

export default function RightToolbar() {
  const dispatch = useAppDispatch()
  const { map } = useMapContext()
  const tool = useAppSelector((s) => s.ui.activeTool)
  const projection = useAppSelector((s) => s.map.projection)
  const [drawOpen, setDrawOpen] = useState(false)
  const drawing = tool.startsWith('draw-')

  const resetNorth = () => map?.easeTo({ bearing: 0, pitch: 0, duration: 600 })
  const zoomWorld = () =>
    map?.flyTo({ center: [10, 25], zoom: 1.6, pitch: 0, bearing: 0, speed: 1.2 })
  const exportPng = () => {
    if (!map) return
    exportMapImage(map)
    dispatch(setToast('Exported map image (PNG)'))
  }

  return (
    <div className="pointer-events-auto absolute right-3 top-16 z-30 flex flex-col gap-1.5">
      <ToolButton
        active={tool === 'measure'}
        onClick={() => dispatch(setActiveTool('measure'))}
        title="Measure distance / area"
      >
        <Ruler size={18} />
      </ToolButton>

      <div className="relative">
        <ToolButton
          active={drawing}
          onClick={() => setDrawOpen((o) => !o)}
          title="Drawing tools"
        >
          <PencilRuler size={18} />
        </ToolButton>
        {drawOpen && (
          <div className="absolute right-12 top-0 flex flex-col gap-1 rounded-lg border border-we-border bg-we-panel p-1 shadow-panel">
            {DRAW_ITEMS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => {
                  dispatch(setActiveTool(id))
                  setDrawOpen(false)
                }}
                className={cx(
                  'flex items-center gap-2 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs',
                  tool === id
                    ? 'bg-we-accent/15 text-we-accent'
                    : 'text-we-muted hover:bg-we-panel-2 hover:text-we-text',
                )}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="my-0.5 h-px w-full bg-we-border" />

      <ToolButton
        active={projection === 'globe'}
        onClick={() => dispatch(toggleProjection())}
        title={projection === 'globe' ? 'Switch to flat map' : 'Switch to 3D globe'}
      >
        {projection === 'globe' ? <Globe2 size={18} /> : <MapIcon size={18} />}
      </ToolButton>
      <ToolButton onClick={resetNorth} title="Reset bearing & pitch (north up)">
        <Compass size={18} />
      </ToolButton>
      <ToolButton onClick={zoomWorld} title="Zoom to whole world">
        <Shrink size={18} />
      </ToolButton>

      <div className="my-0.5 h-px w-full bg-we-border" />

      <ToolButton onClick={exportPng} title="Export map image (PNG)">
        <Camera size={18} />
      </ToolButton>
    </div>
  )
}
