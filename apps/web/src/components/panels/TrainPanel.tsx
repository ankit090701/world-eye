import { useEffect, useMemo } from 'react'
import {
  TrainFront,
  Gauge,
  Clock,
  MapPin,
  LocateFixed,
  Crosshair,
  X,
  Building2,
  Timer,
} from 'lucide-react'
import { PanelShell, SectionTitle, Switch } from '../ui'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { setActivePanel } from '../../store/uiSlice'
import {
  clearTrainCategoryFilter,
  selectTrain,
  setRouteLoading,
  setTrainRoute,
  toggleTrainCategory,
  toggleTrainFollow,
} from '../../store/trainSlice'
import { toggleLayer } from '../../store/layersSlice'
import { useMapContext } from '../../map/MapContext'
import { useTrainSnapshot } from '../../data/trainStore'
import { fetchTrainRoute } from '../../api/trainsApi'
import { haversineMeters } from '../../lib/geo'
import { TRAIN_CATEGORIES, TRAIN_COLORS, TRAIN_LABELS } from '../../config/trainTypes'
import type { Train } from '../../types'
import { cx } from '../../lib/cx'

function relTime(ts: number | null): string {
  if (!ts) return '—'
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000))
  return s < 2 ? 'just now' : `${s}s ago`
}
const hhmm = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'
const fmtSpeed = (t: Train) => (t.speed != null ? `${Math.round(t.speed)} km/h` : '—')

function delayColor(min: number | null | undefined): string {
  if (min == null) return 'text-we-muted'
  if (min >= 5) return 'text-we-danger'
  if (min >= 1) return 'text-we-warn'
  return 'text-we-good'
}
function delayText(min: number | null | undefined): string {
  if (min == null) return '—'
  if (min === 0) return 'On time'
  return min > 0 ? `+${min} min` : `${min} min`
}

export default function TrainPanel() {
  const dispatch = useAppDispatch()
  const { map } = useMapContext()
  const snap = useTrainSnapshot()
  const selectedId = useAppSelector((s) => s.train.selectedId)
  const follow = useAppSelector((s) => s.train.follow)
  const categoryFilter = useAppSelector((s) => s.train.categoryFilter)
  const route = useAppSelector((s) => s.train.selectedRoute)
  const routeLoading = useAppSelector((s) => s.train.routeLoading)
  const source = useAppSelector((s) => s.train.source)
  const status = useAppSelector((s) => s.train.status)
  const error = useAppSelector((s) => s.train.error)
  const view = useAppSelector((s) => s.map.view)
  const trainsLayerOn = useAppSelector(
    (s) => s.layers.items.find((l) => l.id === 'trains')?.visible ?? false,
  )

  const selected = selectedId ? snap.byId[selectedId] : undefined

  // fetch route on selection (real trains only — a sim train's number would
  // otherwise resolve to an unrelated real Finnish route)
  useEffect(() => {
    if (!selected) return
    if (selected.source === 'sim') {
      dispatch(setTrainRoute(null))
      return
    }
    let cancelled = false
    dispatch(setRouteLoading(true))
    fetchTrainRoute(selected.departureDate, selected.trainNumber)
      .then((r) => {
        if (!cancelled) dispatch(setTrainRoute(r))
      })
      .catch(() => {
        if (!cancelled) dispatch(setTrainRoute(null))
      })
    return () => {
      cancelled = true
    }
  }, [selected?.id, dispatch])

  const nearby = useMemo(() => {
    const center: [number, number] = [view.lng, view.lat]
    const list = categoryFilter
      ? snap.trains.filter((t) => categoryFilter.includes(t.category))
      : snap.trains
    return list
      .map((t) => ({ t, d: haversineMeters(center, [t.lon, t.lat]) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 16)
  }, [snap, view.lng, view.lat, categoryFilter])

  const upcoming = useMemo(
    () => (route?.stops ?? []).filter((s) => s.commercial),
    [route],
  )
  const nextStop = upcoming.find((s) => !s.passed)

  const flyTo = (t: Train) =>
    map?.flyTo({ center: [t.lon, t.lat], zoom: Math.max(map.getZoom(), 8), speed: 1.4 })
  const catActive = (c: string) => categoryFilter == null || categoryFilter.includes(c as never)

  return (
    <PanelShell
      title="Train Tracking"
      subtitle="Module 4 · live rail"
      icon={<TrainFront size={16} />}
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
          {snap.trains.length} · {relTime(snap.updatedAt || null)}
        </span>
      </div>
      {error && <div className="mt-2 text-[11px] text-we-warn">{error}</div>}

      <div className="mt-3 flex items-center justify-between rounded-lg border border-we-border bg-we-panel-2/40 px-3 py-2">
        <span className="text-xs text-we-text">Show trains</span>
        <Switch checked={trainsLayerOn} onChange={() => dispatch(toggleLayer('trains'))} />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <SectionTitle>Train types</SectionTitle>
        {categoryFilter && (
          <button
            onClick={() => dispatch(clearTrainCategoryFilter())}
            className="mb-1 text-[10px] text-we-accent hover:underline"
          >
            show all
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {TRAIN_CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => dispatch(toggleTrainCategory(c))}
            className={cx(
              'flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] transition-colors',
              catActive(c)
                ? 'border-we-border-2 bg-we-panel-2 text-we-text'
                : 'border-we-border text-we-muted opacity-50',
            )}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: TRAIN_COLORS[c] }} />
            {TRAIN_LABELS[c]}
          </button>
        ))}
      </div>

      {selected ? (
        <>
          <SectionTitle>Selected train</SectionTitle>
          <div className="rounded-xl border border-we-border bg-we-panel-2/40 p-3">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px] font-bold text-we-bg"
                    style={{ background: TRAIN_COLORS[selected.category] }}
                  >
                    {selected.lineId || selected.trainType || selected.category}
                  </span>
                  <span className="text-base font-semibold text-we-text">#{selected.trainNumber}</span>
                </div>
                <div className="mt-0.5 text-[11px] text-we-muted">
                  {TRAIN_LABELS[selected.category]}
                  {selected.operator && ` · ${selected.operator.toUpperCase()}`}
                </div>
              </div>
              <button
                onClick={() => dispatch(selectTrain(null))}
                className="rounded p-1 text-we-muted hover:text-we-text"
                title="Deselect"
              >
                <X size={14} />
              </button>
            </div>

            <div className="mt-2 flex items-center gap-2 rounded-lg bg-we-bg/50 px-2.5 py-2">
              <MapPin size={13} className="shrink-0 text-we-accent" />
              <div className="min-w-0 flex-1 truncate text-xs text-we-text">
                {selected.origin || '—'}
                <span className="mx-1 text-we-muted">→</span>
                {selected.destination || '—'}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <Metric icon={<Gauge size={12} />} label="Speed" value={fmtSpeed(selected)} />
              <Metric
                icon={<Timer size={12} />}
                label="Delay"
                value={delayText(selected.delayMin)}
                valueClass={delayColor(selected.delayMin)}
              />
              <Metric
                icon={<Clock size={12} />}
                label="Next"
                value={nextStop ? hhmm(nextStop.scheduled) : '—'}
              />
            </div>
            {nextStop && (
              <div className="mt-1 text-center text-[10px] text-we-muted">
                next stop: <span className="text-we-text">{nextStop.name}</span>
              </div>
            )}

            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => dispatch(toggleTrainFollow())}
                className={cx(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] font-medium',
                  follow
                    ? 'border-we-accent/70 bg-we-accent/15 text-we-accent'
                    : 'border-we-border text-we-muted hover:text-we-text',
                )}
              >
                <LocateFixed size={13} /> {follow ? 'Following' : 'Follow'}
              </button>
              <button
                onClick={() => flyTo(selected)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-we-border px-2 py-1.5 text-[11px] text-we-muted hover:text-we-text"
              >
                <Crosshair size={13} /> Center
              </button>
            </div>
          </div>

          {/* schedule */}
          <SectionTitle>Schedule &amp; delays</SectionTitle>
          {routeLoading ? (
            <p className="text-[11px] text-we-muted">Loading route…</p>
          ) : upcoming.length === 0 ? (
            <p className="text-[11px] text-we-muted">No scheduled commercial stops for this service.</p>
          ) : (
            <div className="max-h-64 space-y-0.5 overflow-y-auto pr-1">
              {upcoming.map((s, i) => (
                <div
                  key={`${s.shortCode}-${i}`}
                  className={cx(
                    'flex items-center gap-2 rounded px-2 py-1 text-[11px]',
                    s.passed ? 'opacity-45' : 'bg-we-panel-2/30',
                    s.shortCode === nextStop?.shortCode && 'ring-1 ring-we-accent/40',
                  )}
                >
                  <span
                    className={cx('h-1.5 w-1.5 shrink-0 rounded-full', s.passed ? 'bg-we-muted' : 'bg-we-good')}
                  />
                  <span className="flex-1 truncate text-we-text">{s.name}</span>
                  <span className="font-mono text-we-muted">{hhmm(s.scheduled)}</span>
                  <span className={cx('w-12 text-right font-mono', delayColor(s.delayMin))}>
                    {s.delayMin != null && s.delayMin !== 0 ? delayText(s.delayMin) : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : selectedId ? (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-we-border bg-we-panel-2/40 px-3 py-2 text-[11px] text-we-muted">
          <TrainFront size={13} /> Signal lost — train left the tracked area.
        </div>
      ) : null}

      <SectionTitle>Nearby trains</SectionTitle>
      {nearby.length === 0 ? (
        <p className="text-[11px] text-we-muted">
          No trains in range. Live rail covers Finland; elsewhere a simulated feed is shown.
        </p>
      ) : (
        <div className="space-y-1">
          {nearby.map(({ t, d }) => (
            <button
              key={t.id}
              onClick={() => {
                dispatch(selectTrain(t.id))
                flyTo(t)
              }}
              className={cx(
                'flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left',
                t.id === selectedId
                  ? 'border-we-accent/60 bg-we-accent/10'
                  : 'border-we-border bg-we-panel-2/30 hover:border-we-border-2',
              )}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: TRAIN_COLORS[t.category] }} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium text-we-text">
                  {t.lineId || t.trainType || '#'}
                  {t.trainNumber} · {t.destination || '—'}
                </div>
                <div className="truncate text-[10px] text-we-muted">
                  {TRAIN_LABELS[t.category]} · {fmtSpeed(t)}
                </div>
              </div>
              {t.delayMin != null && t.delayMin >= 1 && (
                <span className={cx('font-mono text-[10px]', delayColor(t.delayMin))}>
                  +{t.delayMin}
                </span>
              )}
              <span className="font-mono text-[10px] text-we-muted">{(d / 1000).toFixed(0)} km</span>
            </button>
          ))}
        </div>
      )}

      <p className="mt-4 flex items-center gap-1 text-[10px] text-we-muted">
        <Building2 size={11} /> Live rail: Fintraffic Digitraffic — free, no key.
      </p>
    </PanelShell>
  )
}

function Metric({
  icon,
  label,
  value,
  valueClass,
}: {
  icon: React.ReactNode
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div className="rounded-lg bg-we-bg/50 px-2 py-1.5">
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-wide text-we-muted">
        {icon}
        {label}
      </div>
      <div className={cx('mt-0.5 truncate font-mono text-xs', valueClass || 'text-we-text')}>{value}</div>
    </div>
  )
}
