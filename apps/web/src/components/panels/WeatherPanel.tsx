import { useEffect } from 'react'
import maplibregl from 'maplibre-gl'
import {
  CloudSun,
  Radar,
  Thermometer,
  Wind,
  Zap,
  Tornado,
  Flame,
  Activity,
  Loader2,
  Crosshair,
  Droplets,
  Gauge,
} from 'lucide-react'
import { PanelShell, SectionTitle, Switch } from '../ui'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { setActivePanel } from '../../store/uiSlice'
import { toggleLayer } from '../../store/layersSlice'
import { currentStart, currentOk, currentError, clearCurrent } from '../../store/weatherSlice'
import { useMapContext } from '../../map/MapContext'
import { fetchWeatherCurrent, fetchWeatherEvents } from '../../api/weatherApi'
import { weatherEventsStore, useWeatherEvents } from '../../data/weatherStore'
import type { CurrentConditions } from '../../types'
import { cx } from '../../lib/cx'

let wxMarker: maplibregl.Marker | null = null
function dropMarker(map: maplibregl.Map, lng: number, lat: number) {
  wxMarker?.remove()
  const el = document.createElement('div')
  el.className = 'we-search-marker'
  el.style.background = '#38bdf8'
  wxMarker = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map)
}

const CITIES: { name: string; lat: number; lon: number }[] = [
  { name: 'London', lat: 51.5, lon: -0.12 },
  { name: 'New York', lat: 40.71, lon: -74.0 },
  { name: 'Tokyo', lat: 35.68, lon: 139.69 },
  { name: 'Mumbai', lat: 19.08, lon: 72.88 },
  { name: 'Sydney', lat: -33.87, lon: 151.21 },
]

const LAYER_TOGGLES: { id: string; label: string; icon: typeof Wind }[] = [
  { id: 'weather-radar', label: 'Precipitation radar', icon: Radar },
  { id: 'weather-temp', label: 'Temperature field', icon: Thermometer },
  { id: 'weather-wind', label: 'Wind', icon: Wind },
  { id: 'weather-lightning', label: 'Lightning / convective', icon: Zap },
  { id: 'cyclones', label: 'Storms & cyclones', icon: Tornado },
  { id: 'wildfires', label: 'Wildfires', icon: Flame },
  { id: 'earthquakes', label: 'Earthquakes', icon: Activity },
]

export default function WeatherPanel() {
  const dispatch = useAppDispatch()
  const { map } = useMapContext()
  const current = useAppSelector((s) => s.weather.current)
  const loading = useAppSelector((s) => s.weather.loading)
  const error = useAppSelector((s) => s.weather.error)
  const layers = useAppSelector((s) => s.layers.items)
  const events = useWeatherEvents()

  // Remove the current-conditions marker when the panel closes.
  useEffect(() => {
    return () => {
      wxMarker?.remove()
    }
  }, [])

  // Ensure the event lists are populated even if all event layers are off.
  useEffect(() => {
    if (events.updatedAt > 0) return
    let cancelled = false
    fetchWeatherEvents()
      .then((r) => {
        if (!cancelled)
          weatherEventsStore.update({
            cyclones: r.cyclones,
            wildfires: r.wildfires,
            earthquakes: r.earthquakes,
            cycloneSource: r.cycloneSource,
          })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [events.updatedAt])

  const queryAt = async (lat: number, lon: number, fly: boolean) => {
    dispatch(currentStart())
    try {
      const c = await fetchWeatherCurrent(lat, lon)
      dispatch(currentOk(c))
      if (map) {
        dropMarker(map, lon, lat)
        if (fly) map.flyTo({ center: [lon, lat], zoom: Math.max(map.getZoom(), 4), speed: 1.2 })
      }
    } catch (err) {
      const msg = err instanceof Error && err.message && !err.message.startsWith('HTTP') ? err.message : null
      dispatch(currentError(msg || 'Weather lookup failed — is the WorldEye API running?'))
    }
  }

  const queryCentre = () => {
    if (!map) return
    const c = map.getCenter()
    queryAt(Number(c.lat.toFixed(3)), Number(c.lng.toFixed(3)), false)
  }

  const visible = (id: string) => layers.find((l) => l.id === id)?.visible ?? false

  const flyToEvent = (lat: number, lon: number) => {
    if (map) map.flyTo({ center: [lon, lat], zoom: Math.max(map.getZoom(), 4), speed: 1.3 })
  }

  return (
    <PanelShell
      title="Weather Intelligence"
      subtitle="Module 9 · conditions, storms, fires, quakes"
      icon={<CloudSun size={16} />}
      onClose={() => dispatch(setActivePanel(null))}
    >
      {/* current conditions */}
      <button
        onClick={queryCentre}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-we-accent/60 bg-we-accent/10 px-3 py-2 text-xs font-medium text-we-text hover:shadow-glow disabled:opacity-40"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Crosshair size={14} className="text-we-accent" />}
        {loading ? 'Fetching…' : 'Weather at map centre'}
      </button>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {CITIES.map((c) => (
          <button
            key={c.name}
            onClick={() => queryAt(c.lat, c.lon, true)}
            className="rounded-full border border-we-border px-2 py-0.5 text-[10px] text-we-muted hover:border-we-border-2 hover:text-we-text"
          >
            {c.name}
          </button>
        ))}
      </div>

      {error && <div className="mt-3 text-[11px] text-we-warn">{error}</div>}
      {current && <CurrentCard c={current} onClear={() => (dispatch(clearCurrent()), wxMarker?.remove())} />}

      {/* layers */}
      <SectionTitle>Weather layers</SectionTitle>
      <div className="space-y-1">
        {LAYER_TOGGLES.map(({ id, label, icon: Icon }) => (
          <div
            key={id}
            className="flex items-center justify-between rounded-lg border border-we-border bg-we-panel-2/40 px-3 py-1.5"
          >
            <span className="flex items-center gap-2 text-xs text-we-text">
              <Icon size={13} className="text-we-accent" />
              {label}
            </span>
            <Switch checked={visible(id)} onChange={() => dispatch(toggleLayer(id))} />
          </div>
        ))}
      </div>

      {/* active events */}
      <SectionTitle>Active events</SectionTitle>
      <div className="space-y-2">
        <EventGroup
          icon={<Tornado size={12} />}
          title={`Cyclones (${events.cyclones.length})`}
          note={events.cycloneSource === 'sim' ? 'sample — none active now' : events.cycloneSource === 'live' ? 'live · NOAA NHC' : ''}
        >
          {events.cyclones.slice(0, 6).map((c) => (
            <EventRow key={c.id} onClick={() => flyToEvent(c.lat, c.lon)} left={c.name} right={`${c.category.toUpperCase()} · ${c.windKt ?? '?'}kt`} />
          ))}
        </EventGroup>

        <EventGroup icon={<Activity size={12} />} title={`Earthquakes (${events.earthquakes.length})`} note="last 24h · USGS">
          {events.earthquakes.slice(0, 6).map((q) => (
            <EventRow key={q.id} onClick={() => flyToEvent(q.lat, q.lon)} left={`M ${q.mag ?? '?'}`} right={q.place ?? ''} />
          ))}
        </EventGroup>

        <EventGroup icon={<Flame size={12} />} title={`Wildfires (${events.wildfires.length})`} note="NASA EONET">
          {events.wildfires.slice(0, 5).map((w) => (
            <EventRow key={w.id} onClick={() => flyToEvent(w.lat, w.lon)} left={w.title} right="" />
          ))}
        </EventGroup>
      </div>

      <p className="mt-4 text-[10px] leading-relaxed text-we-muted">
        Sources: Open-Meteo · RainViewer · NOAA NHC · NASA EONET · USGS — all free, no keys.
      </p>
    </PanelShell>
  )
}

function CurrentCard({ c, onClear }: { c: CurrentConditions; onClear: () => void }) {
  return (
    <div className="mt-3 rounded-xl border border-we-border bg-we-panel-2/40 p-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-2xl font-semibold text-we-text">
            {c.temperature != null ? `${Math.round(c.temperature)}°C` : '—'}
          </div>
          <div className="text-[11px] text-we-muted">{c.weatherText}</div>
        </div>
        <div className="text-right text-[10px] text-we-muted">
          <div>{c.lat.toFixed(2)}, {c.lon.toFixed(2)}</div>
          {c.apparentTemperature != null && <div>feels {Math.round(c.apparentTemperature)}°</div>}
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px]">
        <Metric icon={<Wind size={11} />} label="Wind" value={c.windSpeed != null ? `${Math.round(c.windSpeed)} km/h` : '—'} />
        <Metric icon={<Gauge size={11} />} label="Gusts" value={c.windGusts != null ? `${Math.round(c.windGusts)} km/h` : '—'} />
        <Metric icon={<Droplets size={11} />} label="Humidity" value={c.humidity != null ? `${c.humidity}%` : '—'} />
        <Metric icon={<CloudSun size={11} />} label="Cloud" value={c.cloudCover != null ? `${c.cloudCover}%` : '—'} />
        <Metric icon={<Droplets size={11} />} label="Precip" value={c.precipitation != null ? `${c.precipitation} mm` : '—'} />
        <Metric icon={<Zap size={11} />} label="CAPE" value={c.cape != null ? `${c.cape}` : '—'} />
      </div>
      <button onClick={onClear} className="mt-2 text-[10px] text-we-muted hover:text-we-text">
        clear
      </button>
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
function EventGroup({
  icon,
  title,
  note,
  children,
}: {
  icon: React.ReactNode
  title: string
  note?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-we-border bg-we-panel-2/30 p-2.5">
      <div className="mb-1 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-we-muted">
          <span className="text-we-accent">{icon}</span>
          {title}
        </span>
        {note && <span className="text-[9px] text-we-muted">{note}</span>}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}
function EventRow({ left, right, onClick }: { left: string; right: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'flex w-full items-center justify-between gap-2 rounded px-1.5 py-1 text-left text-[11px] hover:bg-we-panel-2/60',
      )}
    >
      <span className="min-w-0 flex-1 truncate text-we-text">{left}</span>
      <span className="shrink-0 font-mono text-[10px] text-we-muted">{right}</span>
    </button>
  )
}
