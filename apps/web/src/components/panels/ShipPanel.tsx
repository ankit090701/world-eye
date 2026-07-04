import { useMemo } from 'react'
import {
  Ship as ShipIcon,
  Anchor,
  Navigation,
  Gauge,
  Ruler,
  LocateFixed,
  Crosshair,
  X,
  MapPin,
} from 'lucide-react'
import { PanelShell, SectionTitle, Switch } from '../ui'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { setActivePanel } from '../../store/uiSlice'
import {
  clearCategoryFilter,
  selectShip,
  toggleCategory,
  toggleShipFollow,
} from '../../store/shipSlice'
import { toggleLayer } from '../../store/layersSlice'
import { useMapContext } from '../../map/MapContext'
import { useShipSnapshot } from '../../data/shipStore'
import { haversineMeters } from '../../lib/geo'
import { NAV_STATUS, SHIP_CATEGORIES, SHIP_COLORS, SHIP_LABELS } from '../../config/shipTypes'
import type { Ship } from '../../types'
import { cx } from '../../lib/cx'

function relTime(ts: number | null): string {
  if (!ts) return '—'
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000))
  return s < 2 ? 'just now' : `${s}s ago`
}
const fmtSpd = (s: Ship) => (s.sog != null ? `${s.sog.toFixed(1)} kn` : '—')
const fmtCourse = (s: Ship) => {
  const c = s.heading ?? s.cog
  return c != null ? `${Math.round(c)}°` : '—'
}
const fmtDraught = (s: Ship) => (s.draught != null ? `${s.draught.toFixed(1)} m` : '—')

export default function ShipPanel() {
  const dispatch = useAppDispatch()
  const { map } = useMapContext()
  const snap = useShipSnapshot()
  const selectedMmsi = useAppSelector((s) => s.ship.selectedMmsi)
  const follow = useAppSelector((s) => s.ship.follow)
  const categoryFilter = useAppSelector((s) => s.ship.categoryFilter)
  const source = useAppSelector((s) => s.ship.source)
  const status = useAppSelector((s) => s.ship.status)
  const error = useAppSelector((s) => s.ship.error)
  const view = useAppSelector((s) => s.map.view)
  const shipsLayerOn = useAppSelector(
    (s) => s.layers.items.find((l) => l.id === 'ships')?.visible ?? false,
  )

  const selected = selectedMmsi != null ? snap.byMmsi[selectedMmsi] : undefined

  const nearby = useMemo(() => {
    const center: [number, number] = [view.lng, view.lat]
    const list = categoryFilter
      ? snap.ships.filter((s) => categoryFilter.includes(s.category))
      : snap.ships
    return list
      .map((s) => ({ s, d: haversineMeters(center, [s.lon, s.lat]) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 16)
  }, [snap, view.lng, view.lat, categoryFilter])

  const flyTo = (s: Ship) =>
    map?.flyTo({ center: [s.lon, s.lat], zoom: Math.max(map.getZoom(), 9), speed: 1.4 })

  const catActive = (c: string) => categoryFilter == null || categoryFilter.includes(c as never)

  return (
    <PanelShell
      title="Ship Tracking"
      subtitle="Module 3 · live AIS"
      icon={<ShipIcon size={16} />}
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
                ? 'Live AIS'
                : source === 'sim'
                  ? 'Simulated'
                  : 'Connecting…'}
          </span>
        </div>
        <span className="font-mono text-[11px] text-we-muted">
          {snap.ships.length} · {relTime(snap.updatedAt || null)}
        </span>
      </div>
      {error && <div className="mt-2 text-[11px] text-we-warn">{error}</div>}

      <div className="mt-3 flex items-center justify-between rounded-lg border border-we-border bg-we-panel-2/40 px-3 py-2">
        <span className="text-xs text-we-text">Show ships</span>
        <Switch checked={shipsLayerOn} onChange={() => dispatch(toggleLayer('ships'))} />
      </div>

      {/* category filter */}
      <div className="mt-3 flex items-center justify-between">
        <SectionTitle>Vessel types</SectionTitle>
        {categoryFilter && (
          <button
            onClick={() => dispatch(clearCategoryFilter())}
            className="mb-1 text-[10px] text-we-accent hover:underline"
          >
            show all
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {SHIP_CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => dispatch(toggleCategory(c))}
            className={cx(
              'flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] transition-colors',
              catActive(c)
                ? 'border-we-border-2 bg-we-panel-2 text-we-text'
                : 'border-we-border text-we-muted opacity-50',
            )}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: SHIP_COLORS[c] }} />
            {SHIP_LABELS[c]}
          </button>
        ))}
      </div>

      {/* selected ship */}
      {selected ? (
        <>
          <SectionTitle>Selected vessel</SectionTitle>
          <div className="rounded-xl border border-we-border bg-we-panel-2/40 p-3">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <div className="truncate text-base font-semibold text-we-text">
                  {selected.name || `MMSI ${selected.mmsi}`}
                </div>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: SHIP_COLORS[selected.category] }}
                  />
                  <span className="text-[11px] text-we-muted">
                    {SHIP_LABELS[selected.category]}
                    {selected.shipType != null && ` · type ${selected.shipType}`}
                  </span>
                </div>
              </div>
              <button
                onClick={() => dispatch(selectShip(null))}
                className="rounded p-1 text-we-muted hover:text-we-text"
                title="Deselect"
              >
                <X size={14} />
              </button>
            </div>

            {(selected.destination || selected.eta) && (
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-we-bg/50 px-2.5 py-2">
                <MapPin size={14} className="shrink-0 text-we-accent" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium text-we-text">
                    {selected.destination || 'Destination unknown'}
                  </div>
                  {selected.eta && (
                    <div className="text-[10px] text-we-muted">ETA {selected.eta} UTC</div>
                  )}
                </div>
              </div>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2">
              <Metric icon={<Gauge size={12} />} label="Speed" value={fmtSpd(selected)} />
              <Metric icon={<Navigation size={12} />} label="Course" value={fmtCourse(selected)} />
              <Metric
                icon={<Anchor size={12} />}
                label="Status"
                value={selected.navStat != null ? (NAV_STATUS[selected.navStat] ?? `#${selected.navStat}`) : '—'}
              />
              <Metric icon={<Ruler size={12} />} label="Draught" value={fmtDraught(selected)} />
            </div>

            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
              <Field label="MMSI" value={String(selected.mmsi)} />
              <Field label="IMO" value={selected.imo ? String(selected.imo) : null} />
              <Field label="Call sign" value={selected.callSign} />
              <Field label="Flag" value={mmsiFlag(selected.mmsi)} />
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => dispatch(toggleShipFollow())}
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
      ) : selectedMmsi != null ? (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-we-border bg-we-panel-2/40 px-3 py-2 text-[11px] text-we-muted">
          <Anchor size={13} /> Signal lost — vessel left the tracked area.
        </div>
      ) : null}

      {/* nearby */}
      <SectionTitle>Nearby vessels</SectionTitle>
      {nearby.length === 0 ? (
        <p className="text-[11px] text-we-muted">
          No vessels in range. Live AIS covers the Baltic / Finnish waters; elsewhere a simulated
          feed is shown.
        </p>
      ) : (
        <div className="space-y-1">
          {nearby.map(({ s, d }) => (
            <button
              key={s.mmsi}
              onClick={() => {
                dispatch(selectShip(s.mmsi))
                flyTo(s)
              }}
              className={cx(
                'flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left',
                s.mmsi === selectedMmsi
                  ? 'border-we-accent/60 bg-we-accent/10'
                  : 'border-we-border bg-we-panel-2/30 hover:border-we-border-2',
              )}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: SHIP_COLORS[s.category] }} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium text-we-text">
                  {s.name || `MMSI ${s.mmsi}`}
                </div>
                <div className="truncate text-[10px] text-we-muted">
                  {SHIP_LABELS[s.category]} · {fmtSpd(s)}
                </div>
              </div>
              <span className="font-mono text-[10px] text-we-muted">{(d / 1852).toFixed(0)} nm</span>
            </button>
          ))}
        </div>
      )}

      <p className="mt-4 flex items-center gap-1 text-[10px] text-we-muted">
        <ShipIcon size={11} /> Live AIS: Fintraffic Digitraffic (Baltic) — free, no key.
      </p>
    </PanelShell>
  )
}

/** Approximate flag from the MMSI MID (first 3 digits). Small common subset. */
const MID: Record<string, string> = {
  '230': 'Finland',
  '265': 'Sweden',
  '266': 'Sweden',
  '276': 'Estonia',
  '257': 'Norway',
  '258': 'Norway',
  '259': 'Norway',
  '219': 'Denmark',
  '220': 'Denmark',
  '211': 'Germany',
  '218': 'Germany',
  '244': 'Netherlands',
  '245': 'Netherlands',
  '246': 'Netherlands',
  '235': 'United Kingdom',
  '232': 'United Kingdom',
  '227': 'France',
  '228': 'France',
  '247': 'Italy',
  '224': 'Spain',
  '273': 'Russia',
  '338': 'USA',
  '366': 'USA',
  '367': 'USA',
}
function mmsiFlag(mmsi: number): string | null {
  return MID[String(mmsi).slice(0, 3)] ?? null
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-we-bg/50 px-2.5 py-1.5">
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-wide text-we-muted">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 truncate font-mono text-xs text-we-text">{value}</div>
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
