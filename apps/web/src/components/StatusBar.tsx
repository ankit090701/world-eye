import { MousePointer2, Crosshair, PencilRuler, Plane, Ship, TrainFront, Truck, TriangleAlert } from 'lucide-react'
import { useAppSelector } from '../store/hooks'
import { useDrawFeatures } from '../data/drawStore'
import { useVisibleSignals } from '../hooks/useVisibleSignals'
import { formatDMS, formatLngLat } from '../lib/geo'

export default function StatusBar() {
  const cursor = useAppSelector((s) => s.map.cursor)
  const view = useAppSelector((s) => s.map.view)
  const projection = useAppSelector((s) => s.map.projection)
  const mode = useAppSelector((s) => s.timeline.mode)
  const acCount = useAppSelector((s) => s.aircraft.count)
  const acSource = useAppSelector((s) => s.aircraft.source)
  const shipCount = useAppSelector((s) => s.ship.count)
  const shipSource = useAppSelector((s) => s.ship.source)
  const trainCount = useAppSelector((s) => s.train.count)
  const trainSource = useAppSelector((s) => s.train.source)
  const fleetCount = useAppSelector((s) => s.fleet.count)
  const incidentCount = useAppSelector((s) => s.traffic.incidentCount)
  const draws = useDrawFeatures()
  const visible = useVisibleSignals()

  return (
    <footer className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex h-[30px] items-center gap-4 border-t border-we-border bg-we-bg/90 px-3 text-[11px] text-we-muted backdrop-blur">
      <div className="pointer-events-auto flex items-center gap-1.5">
        <MousePointer2 size={12} className="text-we-accent" />
        <span className="font-mono text-we-text">
          {cursor ? formatLngLat(cursor.lng, cursor.lat) : '—, —'}
        </span>
        {cursor && (
          <span className="hidden font-mono text-we-muted md:inline">
            {formatDMS(cursor.lng, cursor.lat)}
          </span>
        )}
      </div>

      <span className="h-3 w-px bg-we-border" />

      <div className="hidden items-center gap-1.5 sm:flex">
        <Crosshair size={12} />
        <span className="font-mono">{formatLngLat(view.lng, view.lat, 2)}</span>
        <span className="ml-2">z{view.zoom.toFixed(1)}</span>
        <span className="ml-2 hidden lg:inline">brg {Math.round(view.bearing)}°</span>
        <span className="ml-2 hidden lg:inline">pitch {Math.round(view.pitch)}°</span>
      </div>

      <div className="flex-1" />

      <div className="pointer-events-auto flex items-center gap-1.5">
        <PencilRuler size={12} />
        <span>{draws.features.length} drawings</span>
      </div>
      <span className="hidden items-center gap-1.5 sm:flex">
        <span className="text-we-text">{visible.length.toLocaleString()}</span> signals
      </span>
      <span className="flex items-center gap-1.5">
        <Plane size={12} className={acSource === 'live' ? 'text-we-good' : 'text-we-accent'} />
        <span className="text-we-text">{acCount.toLocaleString()}</span>
      </span>
      <span className="flex items-center gap-1.5">
        <Ship size={12} className={shipSource === 'live' ? 'text-we-good' : 'text-we-accent'} />
        <span className="text-we-text">{shipCount.toLocaleString()}</span>
      </span>
      <span className="flex items-center gap-1.5">
        <TrainFront size={12} className={trainSource === 'live' ? 'text-we-good' : 'text-we-accent'} />
        <span className="text-we-text">{trainCount.toLocaleString()}</span>
      </span>
      <span className="hidden items-center gap-1.5 lg:flex">
        <Truck size={12} className="text-we-good" />
        <span className="text-we-text">{fleetCount.toLocaleString()}</span>
      </span>
      <span className="hidden items-center gap-1.5 xl:flex">
        <TriangleAlert size={12} className="text-we-warn" />
        <span className="text-we-text">{incidentCount.toLocaleString()}</span>
      </span>
      <span className="uppercase tracking-wide">{projection === 'globe' ? '3D globe' : '2D'}</span>
      <span
        className={mode === 'live' ? 'font-medium text-we-good' : 'font-medium text-we-warn'}
      >
        {mode === 'live' ? 'LIVE' : 'REPLAY'}
      </span>
    </footer>
  )
}
