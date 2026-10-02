import { useState, type CSSProperties, type ReactNode } from 'react'
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
import { defaultView, toggleProjection } from '../store/mapSlice'
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

type Tip = { label: string; style: CSSProperties } | null

// Matches the tailwind `short` screen, where the toolbar runs as a row under the top bar.
const SHORT = '(max-height: 500px)'

function ToolButton({
  active,
  onClick,
  title,
  onTip,
  children,
}: {
  active?: boolean
  onClick: () => void
  title: string
  onTip: (t: Tip) => void
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-label={title}
      aria-pressed={active}
      onPointerEnter={(e) => {
        if (e.pointerType !== 'mouse') return
        const r = e.currentTarget.getBoundingClientRect()
        const style: CSSProperties = window.matchMedia(SHORT).matches
          ? { top: r.bottom + 8, right: window.innerWidth - r.right }
          : { top: r.top + r.height / 2, right: 62, transform: 'translateY(-50%)' }
        onTip({ label: title, style })
      }}
      onPointerLeave={() => onTip(null)}
      className={cx(
        'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
        active ? 'bg-we-accent/10 text-we-accent' : 'text-slate-500 hover:bg-we-panel-2 hover:text-we-text',
      )}
    >
      {children}
    </button>
  )
}

const CARD = 'flex flex-col gap-0.5 rounded-xl border border-we-border bg-white/90 p-1 shadow-card backdrop-blur-xl short:flex-row'

export default function RightToolbar() {
  const dispatch = useAppDispatch()
  const { map } = useMapContext()
  const tool = useAppSelector((s) => s.ui.activeTool)
  const projection = useAppSelector((s) => s.map.projection)
  const [drawOpen, setDrawOpen] = useState(false)
  const [tip, setTip] = useState<Tip>(null)
  const drawing = tool.startsWith('draw-')

  const resetNorth = () => map?.easeTo({ bearing: 0, pitch: 0, duration: 600 })
  const zoomWorld = () => {
    const v = defaultView()
    map?.flyTo({ center: [v.lng, v.lat], zoom: v.zoom, pitch: 0, bearing: 0, speed: 1.2 })
  }
  const exportPng = () => {
    if (!map) return
    exportMapImage(map)
    dispatch(setToast('Exported map image (PNG)'))
  }

  return (
    <>
      <div className="pointer-events-auto absolute right-3 top-[68px] z-30 flex flex-col gap-2 short:flex-row">
        <div className={CARD}>
          <ToolButton
            active={tool === 'measure'}
            onClick={() => dispatch(setActiveTool('measure'))}
            title="Measure distance / area"
            onTip={setTip}
          >
            <Ruler size={17} strokeWidth={1.8} />
          </ToolButton>
          <div className="relative">
            <ToolButton
              active={drawing || drawOpen}
              onClick={() => setDrawOpen((o) => !o)}
              title="Drawing tools"
              onTip={setTip}
            >
              <PencilRuler size={17} strokeWidth={1.8} />
            </ToolButton>
            {drawOpen && (
              <div className="absolute right-11 top-0 flex w-36 flex-col gap-0.5 rounded-xl border border-we-border bg-white p-1 shadow-panel short:right-0 short:top-11">
                {DRAW_ITEMS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => {
                      dispatch(setActiveTool(id))
                      setDrawOpen(false)
                    }}
                    className={cx(
                      'flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium transition-colors',
                      tool === id
                        ? 'bg-we-accent/10 text-we-accent'
                        : 'text-slate-600 hover:bg-we-panel-2 hover:text-we-text',
                    )}
                  >
                    <Icon size={15} strokeWidth={1.8} />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={CARD}>
          <ToolButton
            active={projection === 'globe'}
            onClick={() => dispatch(toggleProjection())}
            title={projection === 'globe' ? 'Switch to flat map' : 'Switch to 3D globe'}
            onTip={setTip}
          >
            {projection === 'globe' ? <Globe2 size={17} strokeWidth={1.8} /> : <MapIcon size={17} strokeWidth={1.8} />}
          </ToolButton>
          <ToolButton onClick={resetNorth} title="Reset bearing & pitch" onTip={setTip}>
            <Compass size={17} strokeWidth={1.8} />
          </ToolButton>
          <ToolButton onClick={zoomWorld} title="Back to world view" onTip={setTip}>
            <Shrink size={17} strokeWidth={1.8} />
          </ToolButton>
        </div>

        <div className={CARD}>
          <ToolButton onClick={exportPng} title="Export map image (PNG)" onTip={setTip}>
            <Camera size={17} strokeWidth={1.8} />
          </ToolButton>
        </div>
      </div>
      {tip && !drawOpen && (
        <div
          className="pointer-events-none fixed z-50 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1 text-[12px] font-medium text-white shadow-lg"
          style={tip.style}
        >
          {tip.label}
        </div>
      )}
    </>
  )
}
