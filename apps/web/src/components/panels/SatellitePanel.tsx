import { useMemo } from 'react'
import {
  Satellite,
  SatelliteDish,
  Sparkles,
  CircleDot,
  Rocket,
  Orbit,
  Search,
  Loader2,
  Gauge,
  ArrowUp,
  MapPin,
} from 'lucide-react'
import { PanelShell, SectionTitle, Switch } from '../ui'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { setActivePanel } from '../../store/uiSlice'
import { toggleLayer } from '../../store/layersSlice'
import { selectSat, setQuery } from '../../store/satelliteSlice'
import { useMapContext } from '../../map/MapContext'
import { useSatSnapshot } from '../../data/satelliteStore'
import type { SatGroup, SatPosition } from '../../types'
import { cx } from '../../lib/cx'

const TOGGLES: { id: string; group: SatGroup | null; label: string; icon: typeof Satellite }[] = [
  { id: 'sat-iss', group: 'iss', label: 'ISS & stations', icon: SatelliteDish },
  { id: 'sat-active', group: 'active', label: 'Notable satellites', icon: Satellite },
  { id: 'sat-starlink', group: 'starlink', label: 'Starlink', icon: Sparkles },
  { id: 'sat-debris', group: 'debris', label: 'Space debris', icon: CircleDot },
  { id: 'sat-launches', group: 'launches', label: 'Recent launches', icon: Rocket },
  { id: 'sat-orbits', group: null, label: 'Orbit path', icon: Orbit },
]

export default function SatellitePanel() {
  const dispatch = useAppDispatch()
  const { map } = useMapContext()
  const layers = useAppSelector((s) => s.layers.items)
  const meta = useAppSelector((s) => s.satellites.meta)
  const selectedId = useAppSelector((s) => s.satellites.selectedId)
  const query = useAppSelector((s) => s.satellites.query)
  const snap = useSatSnapshot()

  const visible = (id: string) => layers.find((l) => l.id === id)?.visible ?? false
  const selected = snap.positions.find((p) => p.noradId === selectedId) ?? null

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    const rank: Record<SatGroup, number> = { iss: 0, active: 1, launches: 2, starlink: 3, debris: 4 }
    return snap.positions
      .filter((p) => (q ? p.name.toLowerCase().includes(q) || String(p.noradId).includes(q) : true))
      .sort((a, b) => rank[a.group] - rank[b.group] || a.name.localeCompare(b.name))
      .slice(0, 80)
  }, [snap.positions, query])

  const pick = (p: SatPosition) => {
    dispatch(selectSat(p.noradId))
    if (map) map.flyTo({ center: [p.lon, p.lat], zoom: Math.max(map.getZoom(), 3), speed: 1.2 })
  }

  return (
    <PanelShell
      title="Satellite Intelligence"
      subtitle="Module 10 · live orbital tracking"
      icon={<Satellite size={16} />}
      onClose={() => dispatch(setActivePanel(null))}
    >
      {/* layer toggles */}
      <div className="space-y-1">
        {TOGGLES.map(({ id, group, label, icon: Icon }) => {
          const m = group ? meta[group] : null
          return (
            <div
              key={id}
              className="flex items-center justify-between rounded-lg border border-we-border bg-we-panel-2/40 px-3 py-1.5"
            >
              <span className="flex items-center gap-2 text-xs text-we-text">
                <Icon size={13} className="text-we-accent" />
                {label}
                {m && m.loading && <Loader2 size={11} className="animate-spin text-we-muted" />}
                {m && m.count > 0 && (
                  <span className="text-[10px] text-we-muted">
                    {m.count}
                    {m.source === 'sim' ? ' (sim)' : ''}
                  </span>
                )}
              </span>
              <Switch checked={visible(id)} onChange={() => dispatch(toggleLayer(id))} />
            </div>
          )
        })}
      </div>

      {/* selected satellite */}
      {selected && <SelectedCard p={selected} onClear={() => dispatch(selectSat(null))} />}

      {/* search + list */}
      <SectionTitle>Tracked objects</SectionTitle>
      <div className="mb-2 flex items-center gap-2 rounded-lg border border-we-border bg-we-panel-2/50 px-2.5 py-2 focus-within:border-we-accent/60">
        <Search size={14} className="text-we-muted" />
        <input
          value={query}
          onChange={(e) => dispatch(setQuery(e.target.value))}
          placeholder="Search by name or NORAD id"
          className="w-full bg-transparent text-xs text-we-text placeholder:text-we-muted focus:outline-none"
        />
      </div>
      <div className="max-h-64 space-y-0.5 overflow-y-auto pr-1">
        {list.length === 0 && (
          <div className="px-1 py-2 text-[11px] text-we-muted">
            No objects yet — enable a layer above (ISS &amp; notable load automatically).
          </div>
        )}
        {list.map((p) => (
          <button
            key={p.noradId}
            onClick={() => pick(p)}
            className={cx(
              'flex w-full items-center justify-between gap-2 rounded px-1.5 py-1 text-left text-[11px] hover:bg-we-panel-2/60',
              p.noradId === selectedId && 'bg-we-accent/10',
            )}
          >
            <span className="min-w-0 flex-1 truncate text-we-text">{p.name}</span>
            <span className="shrink-0 font-mono text-[10px] text-we-muted">{Math.round(p.altKm)} km</span>
          </button>
        ))}
      </div>

      <p className="mt-4 text-[10px] leading-relaxed text-we-muted">
        Orbits propagated in your browser with satellite.js from CelesTrak TLEs — free, no keys.
      </p>
    </PanelShell>
  )
}

function SelectedCard({ p, onClear }: { p: SatPosition; onClear: () => void }) {
  return (
    <div className="mt-3 rounded-xl border border-we-border bg-we-panel-2/40 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-we-text">{p.name}</div>
          <div className="text-[10px] uppercase tracking-wide text-we-muted">
            NORAD {p.noradId} · {p.group}
          </div>
        </div>
        <button onClick={onClear} className="text-[10px] text-we-muted hover:text-we-text">
          clear
        </button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px]">
        <Metric icon={<ArrowUp size={11} />} label="Altitude" value={`${Math.round(p.altKm)} km`} />
        <Metric icon={<Gauge size={11} />} label="Speed" value={`${p.speedKmS.toFixed(2)} km/s`} />
        <Metric icon={<Orbit size={11} />} label="Period" value={p.periodMin != null ? `${p.periodMin.toFixed(1)} min` : '—'} />
        <Metric icon={<Orbit size={11} />} label="Inclination" value={p.inclinationDeg != null ? `${p.inclinationDeg.toFixed(1)}°` : '—'} />
        <Metric icon={<MapPin size={11} />} label="Lat" value={p.lat.toFixed(2)} />
        <Metric icon={<MapPin size={11} />} label="Lon" value={p.lon.toFixed(2)} />
      </div>
      <div className="mt-1 text-[10px] text-we-muted">Ground track drawn on the map · updates live</div>
    </div>
  )
}
function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-we-panel/60 px-2 py-1">
      <span className="flex items-center gap-1 text-we-muted">
        {icon}
        {label}
      </span>
      <span className="font-mono text-we-text">{value}</span>
    </div>
  )
}
