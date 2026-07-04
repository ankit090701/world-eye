import { useEffect, useMemo, useState } from 'react'
import {
  Plane,
  PlaneTakeoff,
  PlaneLanding,
  Crosshair,
  LocateFixed,
  AlertTriangle,
  X,
  Gauge,
  ArrowUp,
  Building2,
  Radio,
} from 'lucide-react'
import { PanelShell, SectionTitle, Switch } from '../ui'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { setActivePanel } from '../../store/uiSlice'
import { selectAircraft, setEmergencyOnly, toggleFollow } from '../../store/aircraftSlice'
import { toggleLayer } from '../../store/layersSlice'
import { useMapContext } from '../../map/MapContext'
import { useAircraftSnapshot } from '../../data/aircraftStore'
import { fetchMeta, fetchRoute } from '../../api/aircraftApi'
import { haversineMeters } from '../../lib/geo'
import type { Aircraft, AircraftMeta, FlightRoute } from '../../types'
import { cx } from '../../lib/cx'

const EMERGENCY_LABEL: Record<string, string> = {
  hijack: 'Unlawful interference (7500)',
  radio: 'Radio failure (7600)',
  general: 'Emergency (7700)',
}

function relTime(ts: number | null): string {
  if (!ts) return '—'
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000))
  return s < 2 ? 'just now' : `${s}s ago`
}
const fmtAlt = (a: Aircraft) => (a.onGround ? 'On ground' : a.altitude != null ? `${a.altitude.toLocaleString()} ft` : '—')
const fmtSpd = (a: Aircraft) => (a.groundSpeed != null ? `${Math.round(a.groundSpeed)} kt` : '—')
const fmtTrk = (a: Aircraft) => (a.track != null ? `${Math.round(a.track)}°` : '—')
const fmtVs = (a: Aircraft) =>
  a.verticalRate != null ? `${a.verticalRate > 0 ? '+' : ''}${a.verticalRate} fpm` : '—'

export default function AircraftPanel() {
  const dispatch = useAppDispatch()
  const { map } = useMapContext()
  const snap = useAircraftSnapshot()
  const selectedHex = useAppSelector((s) => s.aircraft.selectedHex)
  const follow = useAppSelector((s) => s.aircraft.follow)
  const emergencyOnly = useAppSelector((s) => s.aircraft.emergencyOnly)
  const status = useAppSelector((s) => s.aircraft.status)
  const source = useAppSelector((s) => s.aircraft.source)
  const error = useAppSelector((s) => s.aircraft.error)
  const layers = useAppSelector((s) => s.layers.items)
  const view = useAppSelector((s) => s.map.view)

  const aircraftLayerOn = layers.find((l) => l.id === 'aircraft')?.visible ?? false
  const weatherOn = layers.find((l) => l.id === 'weather-radar')?.visible ?? false

  const selected = selectedHex ? snap.byHex[selectedHex] : undefined
  const emergencies = useMemo(() => snap.aircraft.filter((a) => a.emergency), [snap])

  const nearby = useMemo(() => {
    const center: [number, number] = [view.lng, view.lat]
    return snap.aircraft
      .map((a) => ({ a, d: haversineMeters(center, [a.lon, a.lat]) }))
      .sort((x, y) => x.d - y.d)
      .slice(0, 16)
  }, [snap, view.lng, view.lat])

  // enrichment for the selected flight
  const [route, setRoute] = useState<FlightRoute | null>(null)
  const [meta, setMeta] = useState<AircraftMeta | null>(null)
  useEffect(() => {
    setRoute(null)
    setMeta(null)
    if (!selected) return
    let cancelled = false
    if (selected.callsign) fetchRoute(selected.callsign).then((r) => !cancelled && setRoute(r)).catch(() => {})
    fetchMeta(selected.registration || selected.hex).then((m) => !cancelled && setMeta(m)).catch(() => {})
    return () => {
      cancelled = true
    }
  }, [selected?.hex, selected?.callsign, selected?.registration])

  const flyTo = (a: Aircraft) => map?.flyTo({ center: [a.lon, a.lat], zoom: Math.max(map.getZoom(), 7), speed: 1.4 })

  return (
    <PanelShell
      title="Aircraft Tracking"
      subtitle="Module 2 · live flights"
      icon={<Plane size={16} />}
      onClose={() => dispatch(setActivePanel(null))}
    >
      {/* feed status */}
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
                ? 'Live ADS-B'
                : source === 'sim'
                  ? 'Simulated'
                  : 'Connecting…'}
          </span>
        </div>
        <span className="font-mono text-[11px] text-we-muted">
          {snap.aircraft.length} · {relTime(snap.updatedAt || null)}
        </span>
      </div>
      {error && <div className="mt-2 text-[11px] text-we-warn">{error}</div>}

      {/* toggles */}
      <div className="mt-3 space-y-2">
        <ToggleRow label="Show aircraft" checked={aircraftLayerOn} onChange={() => dispatch(toggleLayer('aircraft'))} />
        <ToggleRow label="Weather radar" checked={weatherOn} onChange={() => dispatch(toggleLayer('weather-radar'))} />
        <ToggleRow
          label="Emergencies only"
          checked={emergencyOnly}
          onChange={() => dispatch(setEmergencyOnly(!emergencyOnly))}
        />
      </div>

      {/* emergency alerts */}
      {emergencies.length > 0 && (
        <>
          <SectionTitle>Emergency squawks</SectionTitle>
          <div className="space-y-1.5">
            {emergencies.slice(0, 6).map((a) => (
              <button
                key={a.hex}
                onClick={() => {
                  dispatch(selectAircraft(a.hex))
                  flyTo(a)
                }}
                className="flex w-full items-center gap-2 rounded-lg border border-we-danger/50 bg-we-danger/10 px-2.5 py-2 text-left"
              >
                <AlertTriangle size={14} className="shrink-0 text-we-danger" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold text-we-text">
                    {a.callsign || a.hex.toUpperCase()}
                  </div>
                  <div className="truncate text-[10px] text-we-danger">
                    {a.emergencyKind ? EMERGENCY_LABEL[a.emergencyKind] : `Squawk ${a.squawk}`}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* selected flight */}
      {selected ? (
        <>
          <SectionTitle>Selected flight</SectionTitle>
          <div className="rounded-xl border border-we-border bg-we-panel-2/40 p-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold text-we-text">
                    {selected.callsign || selected.hex.toUpperCase()}
                  </span>
                  {selected.emergency && (
                    <span className="rounded bg-we-danger/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-we-danger">
                      {selected.emergencyKind}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-[11px] text-we-muted">
                  {(route?.airline?.name || meta?.owner) ?? 'Unknown operator'}
                </div>
              </div>
              <button
                onClick={() => dispatch(selectAircraft(null))}
                className="rounded p-1 text-we-muted hover:text-we-text"
                title="Deselect"
              >
                <X size={14} />
              </button>
            </div>

            {/* route */}
            {(route?.origin || route?.destination) && (
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-we-bg/50 px-2.5 py-2">
                <PlaneTakeoff size={14} className="text-we-accent" />
                <div className="min-w-0 flex-1 text-center">
                  <div className="font-mono text-sm font-semibold text-we-text">
                    {route?.origin?.iata || route?.origin?.icao || '???'}
                  </div>
                  <div className="truncate text-[9px] text-we-muted">
                    {route?.origin?.municipality || route?.origin?.name || ''}
                  </div>
                </div>
                <div className="text-we-muted">→</div>
                <div className="min-w-0 flex-1 text-center">
                  <div className="font-mono text-sm font-semibold text-we-text">
                    {route?.destination?.iata || route?.destination?.icao || '???'}
                  </div>
                  <div className="truncate text-[9px] text-we-muted">
                    {route?.destination?.municipality || route?.destination?.name || ''}
                  </div>
                </div>
                <PlaneLanding size={14} className="text-we-accent" />
              </div>
            )}

            {/* metrics */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Metric icon={<ArrowUp size={12} />} label="Altitude" value={fmtAlt(selected)} />
              <Metric icon={<Gauge size={12} />} label="Ground speed" value={fmtSpd(selected)} />
              <Metric icon={<Crosshair size={12} />} label="Heading" value={fmtTrk(selected)} />
              <Metric icon={<ArrowUp size={12} />} label="Vertical" value={fmtVs(selected)} />
            </div>

            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
              <Field label="Registration" value={selected.registration || meta?.registration} />
              <Field label="Type" value={selected.type || meta?.type} />
              <Field label="Squawk" value={selected.squawk} />
              <Field label="Mode-S" value={selected.hex.toUpperCase()} />
              {meta?.manufacturer && <Field label="Maker" value={meta.manufacturer} />}
              {route?.airline?.icao && <Field label="Airline" value={route.airline.icao} />}
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => dispatch(toggleFollow())}
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
        </>
      ) : selectedHex ? (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-we-border bg-we-panel-2/40 px-3 py-2 text-[11px] text-we-muted">
          <Radio size={13} /> Signal lost — aircraft left the tracked area.
        </div>
      ) : null}

      {/* nearby */}
      <SectionTitle>Nearby flights</SectionTitle>
      {nearby.length === 0 ? (
        <p className="text-[11px] text-we-muted">
          No aircraft in range. Zoom to a busy region (e.g. Europe) to see live traffic.
        </p>
      ) : (
        <div className="space-y-1">
          {nearby.map(({ a, d }) => (
            <button
              key={a.hex}
              onClick={() => {
                dispatch(selectAircraft(a.hex))
                flyTo(a)
              }}
              className={cx(
                'flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left',
                a.hex === selectedHex
                  ? 'border-we-accent/60 bg-we-accent/10'
                  : 'border-we-border bg-we-panel-2/30 hover:border-we-border-2',
              )}
            >
              <Plane
                size={13}
                className={a.emergency ? 'text-we-danger' : 'text-we-accent'}
                style={{ transform: `rotate(${(a.track ?? 0) - 45}deg)` }}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium text-we-text">
                  {a.callsign || a.hex.toUpperCase()}
                </div>
                <div className="truncate text-[10px] text-we-muted">
                  {a.type || '—'} · {fmtAlt(a)}
                </div>
              </div>
              <span className="font-mono text-[10px] text-we-muted">
                {(d / 1852).toFixed(0)} nm
              </span>
            </button>
          ))}
        </div>
      )}

      <p className="mt-4 flex items-center gap-1 text-[10px] text-we-muted">
        <Building2 size={11} /> Data: adsb.lol · adsbdb · RainViewer — all free, no keys.
      </p>
    </PanelShell>
  )
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-we-border bg-we-panel-2/40 px-3 py-2">
      <span className="text-xs text-we-text">{label}</span>
      <Switch checked={checked} onChange={onChange} />
    </div>
  )
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-we-bg/50 px-2.5 py-1.5">
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-wide text-we-muted">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 font-mono text-sm text-we-text">{value}</div>
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
