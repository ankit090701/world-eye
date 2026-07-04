import { useMemo } from 'react'
import {
  TriangleAlert,
  Gauge,
  Navigation2,
  X,
  Construction,
  Ban,
  CircleAlert,
  MapPin,
} from 'lucide-react'
import { PanelShell, SectionTitle, Switch } from '../ui'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { setActivePanel } from '../../store/uiSlice'
import { clearTypeFilter, selectIncident, toggleIncidentType } from '../../store/trafficSlice'
import { toggleLayer } from '../../store/layersSlice'
import { useMapContext } from '../../map/MapContext'
import { useTrafficSnapshot } from '../../data/trafficStore'
import {
  CONGESTION_COLORS,
  INCIDENT_COLORS,
  INCIDENT_LABELS,
  INCIDENT_TYPES,
} from '../../config/trafficTypes'
import type { IncidentType, TrafficIncident } from '../../types'
import { cx } from '../../lib/cx'

function relTime(ts: number | null): string {
  if (!ts) return '—'
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000))
  if (s < 60) return `${s}s ago`
  return `${Math.round(s / 60)}m ago`
}
const sevOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }
const typeIcon: Record<IncidentType, React.ReactNode> = {
  accident: <CircleAlert size={13} />,
  closure: <Ban size={13} />,
  roadwork: <Construction size={13} />,
  restriction: <TriangleAlert size={13} />,
  other: <CircleAlert size={13} />,
}

export default function TrafficPanel() {
  const dispatch = useAppDispatch()
  const { map } = useMapContext()
  const snap = useTrafficSnapshot()
  const selectedId = useAppSelector((s) => s.traffic.selectedIncidentId)
  const typeFilter = useAppSelector((s) => s.traffic.typeFilter)
  const source = useAppSelector((s) => s.traffic.source)
  const status = useAppSelector((s) => s.traffic.status)
  const error = useAppSelector((s) => s.traffic.error)
  const incidentsOn = useAppSelector(
    (s) => s.layers.items.find((l) => l.id === 'traffic-incidents')?.visible ?? false,
  )
  const flowOn = useAppSelector((s) => s.layers.items.find((l) => l.id === 'traffic-flow')?.visible ?? false)

  const selected = selectedId ? snap.incidentsById[selectedId] : undefined

  const congestion = useMemo(() => {
    const withSpeed = snap.flow.filter((f) => f.speed != null)
    const avg = withSpeed.length
      ? Math.round(withSpeed.reduce((a, b) => a + (b.speed ?? 0), 0) / withSpeed.length)
      : null
    const c = { free: 0, moderate: 0, heavy: 0, unknown: 0 }
    for (const f of snap.flow) c[f.congestion]++
    return { avg, ...c, total: snap.flow.length }
  }, [snap.flow])

  const incidents = useMemo(() => {
    const list = typeFilter ? snap.incidents.filter((i) => typeFilter.includes(i.type)) : snap.incidents
    return [...list].sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]).slice(0, 80)
  }, [snap.incidents, typeFilter])

  const flyTo = (i: TrafficIncident) =>
    map?.flyTo({ center: [i.lon, i.lat], zoom: Math.max(map.getZoom(), 10), speed: 1.4 })
  const goLive = () => map?.flyTo({ center: [24.94, 60.17], zoom: 7, speed: 1.2 })
  const typeActive = (t: string) => typeFilter == null || typeFilter.includes(t as never)

  return (
    <PanelShell
      title="Traffic Intelligence"
      subtitle="Module 6 · incidents & congestion"
      icon={<TriangleAlert size={16} />}
      onClose={() => dispatch(setActivePanel(null))}
    >
      <div className="flex items-center justify-between rounded-lg border border-we-border bg-we-panel-2/40 px-3 py-2">
        <div className="flex items-center gap-2">
          <span
            className={cx(
              'inline-flex h-2 w-2 rounded-full',
              status === 'error' ? 'bg-we-danger' : source === 'live' ? 'bg-we-good' : 'bg-we-warn',
            )}
          />
          <span className="text-xs font-medium text-we-text">
            {status === 'error'
              ? 'Feed offline'
              : source === 'live'
                ? 'Live (Finland)'
                : source === 'sim'
                  ? 'Simulated'
                  : 'Connecting…'}
          </span>
        </div>
        <span className="font-mono text-[11px] text-we-muted">
          {snap.incidents.length} inc · {snap.flow.length} sensors
        </span>
      </div>
      {error && <div className="mt-2 text-[11px] text-we-warn">{error}</div>}

      <button
        onClick={goLive}
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-we-accent/50 bg-we-accent/10 px-2 py-1.5 text-[11px] font-medium text-we-text hover:shadow-glow"
      >
        <MapPin size={13} className="text-we-accent" /> Go to live coverage (Finland)
      </button>

      {/* congestion summary */}
      <SectionTitle>Congestion</SectionTitle>
      <div className="rounded-lg border border-we-border bg-we-panel-2/40 p-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[11px] text-we-muted">
            <Gauge size={12} /> Avg speed
          </span>
          <span className="font-mono text-sm text-we-text">
            {congestion.avg != null ? `${congestion.avg} km/h` : '—'}
          </span>
        </div>
        {congestion.total > 0 && (
          <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-we-bg">
            {(['free', 'moderate', 'heavy'] as const).map((k) => (
              <div
                key={k}
                style={{
                  width: `${(congestion[k] / congestion.total) * 100}%`,
                  background: CONGESTION_COLORS[k],
                }}
              />
            ))}
          </div>
        )}
        <div className="mt-1.5 flex justify-between text-[10px] text-we-muted">
          <span style={{ color: CONGESTION_COLORS.free }}>{congestion.free} free</span>
          <span style={{ color: CONGESTION_COLORS.moderate }}>{congestion.moderate} moderate</span>
          <span style={{ color: CONGESTION_COLORS.heavy }}>{congestion.heavy} heavy</span>
        </div>
      </div>

      {/* layer toggles */}
      <div className="mt-3 space-y-2">
        <ToggleRow label="Incidents" checked={incidentsOn} onChange={() => dispatch(toggleLayer('traffic-incidents'))} />
        <ToggleRow
          label="Flow / congestion"
          checked={flowOn}
          onChange={() => dispatch(toggleLayer('traffic-flow'))}
        />
      </div>

      {/* selected incident */}
      {selected && (
        <>
          <SectionTitle>Selected incident</SectionTitle>
          <div className="rounded-xl border border-we-border bg-we-panel-2/40 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span style={{ color: INCIDENT_COLORS[selected.type] }}>{typeIcon[selected.type]}</span>
                <span className="text-xs font-semibold uppercase tracking-wide text-we-text">
                  {INCIDENT_LABELS[selected.type]}
                </span>
                <span
                  className={cx(
                    'rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase',
                    selected.severity === 'high'
                      ? 'bg-we-danger/20 text-we-danger'
                      : selected.severity === 'medium'
                        ? 'bg-we-warn/20 text-we-warn'
                        : 'bg-we-panel text-we-muted',
                  )}
                >
                  {selected.severity}
                </span>
              </div>
              <button
                onClick={() => dispatch(selectIncident(null))}
                className="rounded p-1 text-we-muted hover:text-we-text"
                title="Deselect"
              >
                <X size={14} />
              </button>
            </div>
            <div className="mt-2 text-xs leading-snug text-we-text">{selected.title}</div>
            {selected.description && (
              <div className="mt-1 text-[11px] leading-snug text-we-muted">{selected.description}</div>
            )}
            <div className="mt-2 flex items-center justify-between text-[10px] text-we-muted">
              <span>{selected.roads ? `Road: ${selected.roads}` : selected.source === 'sim' ? 'Simulated' : 'Live'}</span>
              {selected.startTime && <span>since {new Date(selected.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
            </div>
          </div>
        </>
      )}

      {/* incident type filter */}
      <div className="mt-3 flex items-center justify-between">
        <SectionTitle>Incidents ({incidents.length})</SectionTitle>
        {typeFilter && (
          <button onClick={() => dispatch(clearTypeFilter())} className="mb-1 text-[10px] text-we-accent hover:underline">
            show all
          </button>
        )}
      </div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {INCIDENT_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => dispatch(toggleIncidentType(t))}
            className={cx(
              'flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] transition-colors',
              typeActive(t)
                ? 'border-we-border-2 bg-we-panel-2 text-we-text'
                : 'border-we-border text-we-muted opacity-50',
            )}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: INCIDENT_COLORS[t] }} />
            {INCIDENT_LABELS[t]}
          </button>
        ))}
      </div>

      {incidents.length === 0 ? (
        <p className="text-[11px] text-we-muted">
          No incidents in view. Live coverage is Finland; elsewhere a simulated feed is shown.
        </p>
      ) : (
        <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
          {incidents.map((i) => (
            <button
              key={i.id}
              onClick={() => {
                dispatch(selectIncident(i.id))
                flyTo(i)
              }}
              className={cx(
                'flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left',
                i.id === selectedId
                  ? 'border-we-accent/60 bg-we-accent/10'
                  : 'border-we-border bg-we-panel-2/30 hover:border-we-border-2',
              )}
            >
              <span style={{ color: INCIDENT_COLORS[i.type] }}>{typeIcon[i.type]}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[11px] font-medium text-we-text">{i.title}</div>
                <div className="truncate text-[10px] text-we-muted">
                  {INCIDENT_LABELS[i.type]}
                  {i.roads ? ` · ${i.roads}` : ''} · {relTime(i.startTime)}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <p className="mt-4 flex items-center gap-1 text-[10px] text-we-muted">
        <Navigation2 size={11} /> Live traffic: Fintraffic Digitraffic — free, no key.
      </p>
    </PanelShell>
  )
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-we-border bg-we-panel-2/40 px-3 py-2">
      <span className="text-xs text-we-text">{label}</span>
      <Switch checked={checked} onChange={onChange} />
    </div>
  )
}
