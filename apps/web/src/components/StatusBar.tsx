import type { ReactNode } from 'react'
import { MousePointer2, Crosshair, PencilRuler, Plane, Ship, TrainFront, Truck, TriangleAlert } from 'lucide-react'
import { useAppSelector } from '../store/hooks'
import { useDrawFeatures } from '../data/drawStore'
import { useVisibleSignals } from '../hooks/useVisibleSignals'
import { formatDMS, formatLngLat } from '../lib/geo'
import { cx } from '../lib/cx'

function Count({ icon, value, tone, title, className }: { icon: ReactNode; value: number; tone: string; title: string; className?: string }) {
  return (
    <span className={cx('flex items-center gap-1.5', className)} title={title}>
      <span className={tone}>{icon}</span>
      <span className="font-medium tabular-nums text-slate-700">{value.toLocaleString()}</span>
    </span>
  )
}

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
  const feedTone = (source: string | null) => (source === 'live' ? 'text-we-good' : 'text-we-warn')

  return (
    <footer className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex h-[30px] items-center gap-4 border-t border-we-border bg-white/90 px-4 text-[11px] text-we-muted backdrop-blur-xl">
      <div className="pointer-events-auto flex items-center gap-1.5">
        <MousePointer2 size={12} className="text-slate-400" />
        <span className="font-mono tabular-nums text-slate-700">
          {cursor ? formatLngLat(cursor.lng, cursor.lat) : '—, —'}
        </span>
        {cursor && (
          <span className="hidden font-mono text-we-muted md:inline">{formatDMS(cursor.lng, cursor.lat)}</span>
        )}
      </div>

      <span className="h-3 w-px bg-we-border" />

      <div className="hidden items-center gap-1.5 sm:flex">
        <Crosshair size={12} className="text-slate-400" />
        <span className="font-mono tabular-nums">{formatLngLat(view.lng, view.lat, 2)}</span>
        <span className="ml-2 tabular-nums">z{view.zoom.toFixed(1)}</span>
        <span className="ml-2 hidden tabular-nums lg:inline">brg {Math.round(view.bearing)}°</span>
        <span className="ml-2 hidden tabular-nums lg:inline">pitch {Math.round(view.pitch)}°</span>
      </div>

      <div className="flex-1" />

      <span className="flex items-center gap-1.5">
        <PencilRuler size={12} className="text-slate-400" />
        {draws.features.length} drawings
      </span>
      <span className="hidden items-center gap-1 sm:flex">
        <span className="font-medium tabular-nums text-slate-700">{visible.length.toLocaleString()}</span> signals
      </span>
      <span className="h-3 w-px bg-we-border" />
      <Count icon={<Plane size={12} />} value={acCount} tone={feedTone(acSource)} title="Aircraft" />
      <Count icon={<Ship size={12} />} value={shipCount} tone={feedTone(shipSource)} title="Vessels" />
      <Count icon={<TrainFront size={12} />} value={trainCount} tone={feedTone(trainSource)} title="Trains" />
      <Count icon={<Truck size={12} />} value={fleetCount} tone="text-we-good" title="Fleet vehicles" className="hidden lg:flex" />
      <Count icon={<TriangleAlert size={12} />} value={incidentCount} tone="text-we-warn" title="Traffic incidents" className="hidden xl:flex" />
      <span className="h-3 w-px bg-we-border" />
      <span className="font-medium uppercase tracking-wide">{projection === 'globe' ? '3D globe' : '2D map'}</span>
      <span className={cx('font-semibold', mode === 'live' ? 'text-we-good' : 'text-we-warn')}>
        {mode === 'live' ? 'LIVE' : 'REPLAY'}
      </span>
    </footer>
  )
}
