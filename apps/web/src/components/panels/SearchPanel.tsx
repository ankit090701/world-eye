import { useState } from 'react'
import maplibregl from 'maplibre-gl'
import { Search, MapPin, Crosshair, Loader2, LocateFixed } from 'lucide-react'
import { PanelShell } from '../ui'
import { useAppDispatch } from '../../store/hooks'
import { setActivePanel, setToast } from '../../store/uiSlice'
import { useMapContext } from '../../map/MapContext'
import { formatDMS, parseLatLng } from '../../lib/geo'

interface GeoResult {
  display_name: string
  lat: string
  lon: string
  type?: string
  boundingbox?: [string, string, string, string]
}

// Persist the search marker across panel open/close.
let searchMarker: maplibregl.Marker | null = null
function dropMarker(map: maplibregl.Map, lng: number, lat: number) {
  searchMarker?.remove()
  const el = document.createElement('div')
  el.className = 'we-search-marker'
  searchMarker = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map)
}

export default function SearchPanel() {
  const dispatch = useAppDispatch()
  const { map } = useMapContext()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeoResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const coord = parseLatLng(query)

  const goToCoord = () => {
    if (!coord || !map) return
    const [lng, lat] = coord
    dropMarker(map, lng, lat)
    map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 8), speed: 1.4 })
    dispatch(setToast(`Moved to ${lat.toFixed(4)}, ${lng.toFixed(4)}`))
  }

  const geocode = async () => {
    const q = query.trim()
    if (!q) return
    setLoading(true)
    setError(null)
    setResults([])
    try {
      const url =
        'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&q=' +
        encodeURIComponent(q)
      const res = await fetch(url, { headers: { Accept: 'application/json' } })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as GeoResult[]
      setResults(data)
      if (data.length === 0) setError('No matching places found.')
    } catch (e) {
      setError('Search failed. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (coord) goToCoord()
    else geocode()
  }

  const pickResult = (r: GeoResult) => {
    if (!map) return
    const lng = parseFloat(r.lon)
    const lat = parseFloat(r.lat)
    dropMarker(map, lng, lat)
    if (r.boundingbox) {
      const [s, n, w, e] = r.boundingbox.map(Number)
      map.fitBounds(
        [
          [w, s],
          [e, n],
        ],
        { padding: 80, maxZoom: 14, duration: 1200 },
      )
    } else {
      map.flyTo({ center: [lng, lat], zoom: 11, speed: 1.4 })
    }
    dispatch(setToast(r.display_name.split(',')[0]))
  }

  return (
    <PanelShell
      title="Search"
      subtitle="Coordinates or place names"
      icon={<Search size={16} />}
      onClose={() => dispatch(setActivePanel(null))}
    >
      <form onSubmit={onSubmit} className="space-y-2">
        <div className="flex items-center gap-2 rounded-lg border border-we-border bg-we-panel-2/50 px-2.5 py-2 focus-within:border-we-accent/60">
          <Search size={14} className="text-we-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Paris  ·  48.8566, 2.3522"
            className="w-full bg-transparent text-xs text-we-text placeholder:text-we-muted focus:outline-none"
          />
        </div>

        {coord ? (
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-we-accent/60 bg-we-accent/10 px-3 py-2 text-xs font-medium text-we-text shadow-glow"
          >
            <Crosshair size={14} className="text-we-accent" />
            Go to {formatDMS(coord[0], coord[1])}
          </button>
        ) : (
          <button
            type="submit"
            disabled={loading || query.trim().length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-we-border bg-we-panel-2/60 px-3 py-2 text-xs font-medium text-we-text hover:border-we-border-2 disabled:opacity-40"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            Search places
          </button>
        )}
      </form>

      {map && (
        <button
          onClick={() => {
            const c = map.getCenter()
            setQuery(`${c.lat.toFixed(4)}, ${c.lng.toFixed(4)}`)
          }}
          className="mt-2 flex items-center gap-1.5 text-[11px] text-we-muted hover:text-we-accent"
        >
          <LocateFixed size={12} /> Use map centre
        </button>
      )}

      {error && <div className="mt-3 text-[11px] text-we-warn">{error}</div>}

      {results.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => pickResult(r)}
              className="flex w-full items-start gap-2 rounded-lg border border-we-border bg-we-panel-2/40 px-2.5 py-2 text-left hover:border-we-accent/50 hover:bg-we-accent/5"
            >
              <MapPin size={13} className="mt-0.5 shrink-0 text-we-accent" />
              <div className="min-w-0">
                <div className="truncate text-xs text-we-text">
                  {r.display_name.split(',')[0]}
                </div>
                <div className="truncate text-[10px] text-we-muted">{r.display_name}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      <p className="mt-4 text-[10px] leading-relaxed text-we-muted">
        Place search uses the free OpenStreetMap Nominatim service. Enter{' '}
        <span className="font-mono text-we-text">lat, lng</span> to jump straight to a coordinate.
      </p>
    </PanelShell>
  )
}
