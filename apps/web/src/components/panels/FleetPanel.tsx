import { useMemo } from 'react'
import {
  Truck,
  Fuel,
  Gauge,
  User,
  Wrench,
  MapPin,
  LocateFixed,
  Crosshair,
  X,
  AlertTriangle,
  Navigation,
  Route,
  Power,
} from 'lucide-react'
import { PanelShell, SectionTitle, Switch } from '../ui'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { setActivePanel, setToast } from '../../store/uiSlice'
import {
  clearStatusFilter,
  selectVehicle,
  setDepot,
  toggleFleetFollow,
  toggleStatusFilter,
} from '../../store/fleetSlice'
import { toggleLayer } from '../../store/layersSlice'
import { useMapContext } from '../../map/MapContext'
import { useFleetSnapshot } from '../../data/fleetStore'
import { STATUS_COLORS, STATUS_LABELS, TYPE_LABELS, VEHICLE_STATUSES } from '../../config/fleetTypes'
import type { Vehicle } from '../../types'
import { cx } from '../../lib/cx'

function relTime(ts: number | null): string {
  if (!ts) return '—'
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000))
  if (s < 60) return `${s}s ago`
  return `${Math.round(s / 60)}m ago`
}
const sevColor: Record<string, string> = {
  critical: 'text-we-danger',
  warning: 'text-we-warn',
  info: 'text-we-info',
}
const sevBorder: Record<string, string> = {
  critical: 'border-we-danger/50 bg-we-danger/10',
  warning: 'border-we-warn/40 bg-we-warn/10',
  info: 'border-we-border bg-we-panel-2/40',
}
function fuelColor(p: number): string {
  if (p > 50) return '#22c55e'
  if (p > 20) return '#f59e0b'
  return '#ef4444'
}

export default function FleetPanel() {
  const dispatch = useAppDispatch()
  const { map } = useMapContext()
  const snap = useFleetSnapshot()
  const selectedId = useAppSelector((s) => s.fleet.selectedId)
  const follow = useAppSelector((s) => s.fleet.follow)
  const statusFilter = useAppSelector((s) => s.fleet.statusFilter)
  const status = useAppSelector((s) => s.fleet.status)
  const error = useAppSelector((s) => s.fleet.error)
  const view = useAppSelector((s) => s.map.view)
  const geofencesOn = useAppSelector(
    (s) => s.layers.items.find((l) => l.id === 'geofences')?.visible ?? false,
  )
  const fleetOn = useAppSelector((s) => s.layers.items.find((l) => l.id === 'fleet')?.visible ?? false)

  const selected = selectedId ? snap.byId[selectedId] : undefined

  const counts = useMemo(() => {
    const c = { moving: 0, idle: 0, parked: 0, offline: 0 }
    for (const v of snap.vehicles) c[v.status]++
    return c
  }, [snap])

  const list = useMemo(
    () => (statusFilter ? snap.vehicles.filter((v) => statusFilter.includes(v.status)) : snap.vehicles),
    [snap, statusFilter],
  )

  const locateFleet = () => {
    if (!map || snap.vehicles.length === 0) return
    let minLon = 180,
      minLat = 90,
      maxLon = -180,
      maxLat = -90
    for (const v of snap.vehicles) {
      minLon = Math.min(minLon, v.lon)
      maxLon = Math.max(maxLon, v.lon)
      minLat = Math.min(minLat, v.lat)
      maxLat = Math.max(maxLat, v.lat)
    }
    map.fitBounds(
      [
        [minLon, minLat],
        [maxLon, maxLat],
      ],
      { padding: 120, maxZoom: 13, duration: 1200 },
    )
  }

  const operateHere = () => {
    dispatch(setDepot({ lat: view.lat, lon: view.lng }))
    dispatch(selectVehicle(null))
    dispatch(setToast('Fleet relocated to map centre'))
  }

  const flyTo = (v: Vehicle) =>
    map?.flyTo({ center: [v.lon, v.lat], zoom: Math.max(map.getZoom(), 12), speed: 1.4 })

  const statActive = (s: string) => statusFilter == null || statusFilter.includes(s as never)

  return (
    <PanelShell
      title="Fleet Tracking"
      subtitle="Module 5 · authorized devices"
      icon={<Truck size={16} />}
      onClose={() => dispatch(setActivePanel(null))}
    >
      {/* status + overview */}
      <div className="flex items-center justify-between rounded-lg border border-we-border bg-we-panel-2/40 px-3 py-2">
        <div className="flex items-center gap-2">
          <span
            className={cx(
              'inline-flex h-2 w-2 rounded-full',
              status === 'error' ? 'bg-we-danger' : 'bg-we-good',
            )}
          />
          <span className="text-xs font-medium text-we-text">
            {status === 'error' ? 'Feed offline' : status === 'ok' ? 'Telematics live' : 'Connecting…'}
          </span>
        </div>
        <span className="font-mono text-[11px] text-we-muted">
          {snap.vehicles.length} · {relTime(snap.updatedAt || null)}
        </span>
      </div>
      {error && <div className="mt-2 text-[11px] text-we-warn">{error}</div>}

      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {VEHICLE_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => dispatch(toggleStatusFilter(s))}
            className={cx(
              'rounded-lg border px-1 py-1.5 text-center transition-colors',
              statActive(s) ? 'border-we-border-2 bg-we-panel-2/60' : 'border-we-border opacity-45',
            )}
          >
            <div className="font-mono text-sm font-semibold" style={{ color: STATUS_COLORS[s] }}>
              {counts[s]}
            </div>
            <div className="text-[9px] text-we-muted">{STATUS_LABELS[s]}</div>
          </button>
        ))}
      </div>

      <div className="mt-2 flex gap-2">
        <button
          onClick={locateFleet}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-we-accent/50 bg-we-accent/10 px-2 py-1.5 text-[11px] font-medium text-we-text hover:shadow-glow"
        >
          <LocateFixed size={13} className="text-we-accent" /> Locate fleet
        </button>
        <button
          onClick={operateHere}
          title="Relocate the demo fleet to the current map centre"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-we-border px-2 py-1.5 text-[11px] text-we-muted hover:text-we-text"
        >
          <MapPin size={13} /> Operate here
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <div className="flex flex-1 items-center justify-between rounded-lg border border-we-border bg-we-panel-2/40 px-3 py-1.5">
          <span className="text-[11px] text-we-text">Vehicles</span>
          <Switch checked={fleetOn} onChange={() => dispatch(toggleLayer('fleet'))} />
        </div>
        <div className="flex flex-1 items-center justify-between rounded-lg border border-we-border bg-we-panel-2/40 px-3 py-1.5">
          <span className="text-[11px] text-we-text">Geofences</span>
          <Switch checked={geofencesOn} onChange={() => dispatch(toggleLayer('geofences'))} />
        </div>
      </div>

      {statusFilter && (
        <button
          onClick={() => dispatch(clearStatusFilter())}
          className="mt-1 text-[10px] text-we-accent hover:underline"
        >
          clear status filter
        </button>
      )}

      {/* alerts */}
      {snap.alerts.length > 0 && (
        <>
          <SectionTitle>Alerts ({snap.alerts.length})</SectionTitle>
          <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
            {snap.alerts.map((a) => (
              <button
                key={a.id}
                onClick={() => {
                  dispatch(selectVehicle(a.vehicleId))
                  const v = snap.byId[a.vehicleId]
                  if (v) flyTo(v)
                }}
                className={cx(
                  'flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left',
                  sevBorder[a.severity],
                )}
              >
                <AlertTriangle size={13} className={cx('shrink-0', sevColor[a.severity])} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[11px] font-medium text-we-text">{a.message}</div>
                  <div className="truncate text-[9px] text-we-muted">{a.vehicleName}</div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* selected vehicle */}
      {selected ? (
        <>
          <SectionTitle>Selected vehicle</SectionTitle>
          <div className="rounded-xl border border-we-border bg-we-panel-2/40 p-3">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold text-we-text">{selected.name}</span>
                  <span
                    className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase text-we-bg"
                    style={{ background: STATUS_COLORS[selected.status] }}
                  >
                    {STATUS_LABELS[selected.status]}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-we-muted">
                  <User size={11} /> {selected.driver} · {TYPE_LABELS[selected.type]}
                </div>
              </div>
              <button
                onClick={() => dispatch(selectVehicle(null))}
                className="rounded p-1 text-we-muted hover:text-we-text"
                title="Deselect"
              >
                <X size={14} />
              </button>
            </div>

            {/* fuel gauge */}
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-[10px] text-we-muted">
                <span className="flex items-center gap-1">
                  <Fuel size={11} /> Fuel
                </span>
                <span className="font-mono text-we-text">{selected.fuelPct}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-we-bg">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${selected.fuelPct}%`, background: fuelColor(selected.fuelPct) }}
                />
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <Metric icon={<Gauge size={12} />} label="Speed" value={`${selected.speed} km/h`} />
              <Metric icon={<Navigation size={12} />} label="Heading" value={`${selected.heading}°`} />
              <Metric icon={<Power size={12} />} label="Engine" value={selected.engineStatus} />
            </div>

            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
              <Field label="Odometer" value={`${selected.odometerKm.toLocaleString()} km`} />
              <Field
                label="Service"
                value={
                  selected.odometerKm >= selected.nextServiceKm
                    ? 'Overdue'
                    : `${(selected.nextServiceKm - selected.odometerKm).toLocaleString()} km`
                }
              />
              <Field label="Zone" value={selected.geofence} />
              <Field label="Update" value={relTime(selected.lastUpdate)} />
            </div>

            {selected.odometerKm >= selected.nextServiceKm - 400 && (
              <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-we-warn/40 bg-we-warn/10 px-2 py-1 text-[10px] text-we-warn">
                <Wrench size={11} /> Maintenance due soon
              </div>
            )}

            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => dispatch(toggleFleetFollow())}
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

          {/* trip history */}
          <SectionTitle>Trip history</SectionTitle>
          <div className="space-y-1">
            {selected.trips.map((t, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg bg-we-panel-2/30 px-2.5 py-1.5 text-[11px]">
                <Route size={12} className="shrink-0 text-we-muted" />
                <div className="min-w-0 flex-1 truncate text-we-text">
                  {t.from} <span className="text-we-muted">→</span> {t.to}
                </div>
                <span className="font-mono text-[10px] text-we-muted">
                  {t.distanceKm} km · {t.durationMin}m
                </span>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {/* vehicle list */}
      <SectionTitle>Vehicles ({list.length})</SectionTitle>
      <div className="space-y-1">
        {list.map((v) => (
          <button
            key={v.id}
            onClick={() => {
              dispatch(selectVehicle(v.id))
              flyTo(v)
            }}
            className={cx(
              'flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left',
              v.id === selectedId
                ? 'border-we-accent/60 bg-we-accent/10'
                : 'border-we-border bg-we-panel-2/30 hover:border-we-border-2',
            )}
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: STATUS_COLORS[v.status] }} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-we-text">{v.name}</div>
              <div className="truncate text-[10px] text-we-muted">
                {v.driver} · {v.speed} km/h
              </div>
            </div>
            <span className="font-mono text-[10px]" style={{ color: fuelColor(v.fuelPct) }}>
              {v.fuelPct}%
            </span>
          </button>
        ))}
      </div>
    </PanelShell>
  )
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-we-bg/50 px-2 py-1.5">
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-wide text-we-muted">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 truncate font-mono text-xs capitalize text-we-text">{value}</div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-we-muted">{label}</span>
      <span className="truncate font-mono text-we-text">{value || '—'}</span>
    </div>
  )
}
