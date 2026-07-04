import { useEffect } from 'react'
import maplibregl from 'maplibre-gl'
import type { Feature } from 'geojson'
import { useMapContext } from '../MapContext'
import { useAppSelector } from '../../store/hooks'
import {
  weatherEventsStore,
  weatherGridStore,
  useWeatherEvents,
  useWeatherGrid,
} from '../../data/weatherStore'
import { fetchWeatherEvents, fetchWeatherGrid } from '../../api/weatherApi'
import {
  setCycloneData,
  setEarthquakeData,
  setWeatherGridData,
  setWildfireData,
} from '../mapLayers'
import { LYR } from '../ids'

function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
function compass(deg: number | null | undefined): string {
  if (deg == null) return ''
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return dirs[Math.round(deg / 45) % 8]
}
const CAT_LABEL: Record<string, string> = {
  td: 'Tropical Depression',
  ts: 'Tropical Storm',
  cat1: 'Category 1 Hurricane',
  cat2: 'Category 2 Hurricane',
  cat3: 'Category 3 Hurricane',
  cat4: 'Category 4 Hurricane',
  cat5: 'Category 5 Hurricane',
}

function useLayerVisible(id: string): boolean {
  return useAppSelector((s) => s.layers.items.find((l) => l.id === id)?.visible ?? false)
}

// ---------- engines (poll only while a relevant layer is visible) ----------
export function WeatherGridEngine() {
  const temp = useLayerVisible('weather-temp')
  const wind = useLayerVisible('weather-wind')
  const lightning = useLayerVisible('weather-lightning')
  const enabled = temp || wind || lightning

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    const poll = async () => {
      try {
        const r = await fetchWeatherGrid()
        if (!cancelled) weatherGridStore.update(r.points, r.source)
      } catch {
        /* keep last */
      }
    }
    poll()
    const id = window.setInterval(poll, 10 * 60 * 1000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [enabled])

  return null
}

export function WeatherEventsEngine() {
  const cyc = useLayerVisible('cyclones')
  const fire = useLayerVisible('wildfires')
  const quake = useLayerVisible('earthquakes')
  const enabled = cyc || fire || quake

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    const poll = async () => {
      try {
        const r = await fetchWeatherEvents()
        if (!cancelled) {
          weatherEventsStore.update({
            cyclones: r.cyclones,
            wildfires: r.wildfires,
            earthquakes: r.earthquakes,
            cycloneSource: r.cycloneSource,
          })
        }
      } catch {
        /* keep last */
      }
    }
    poll()
    const id = window.setInterval(poll, 3 * 60 * 1000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [enabled])

  return null
}

// ---------- syncers (store → map source) ----------
export function WeatherGridSync() {
  const { map } = useMapContext()
  const epoch = useAppSelector((s) => s.map.styleEpoch)
  const snap = useWeatherGrid()

  useEffect(() => {
    if (!map || epoch === 0) return
    const features: Feature[] = snap.points.map((p) => ({
      type: 'Feature',
      properties: {
        temp: p.temp,
        windSpeed: p.windSpeed,
        windDir: p.windDir,
        cloud: p.cloud,
        cape: p.cape,
        lightning: p.lightning,
      },
      geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
    }))
    setWeatherGridData(map, { type: 'FeatureCollection', features })
  }, [map, epoch, snap])

  return null
}

export function WeatherEventsSync() {
  const { map } = useMapContext()
  const epoch = useAppSelector((s) => s.map.styleEpoch)
  const snap = useWeatherEvents()

  useEffect(() => {
    if (!map || epoch === 0) return
    setCycloneData(map, {
      type: 'FeatureCollection',
      features: snap.cyclones.map((c) => ({
        type: 'Feature',
        properties: { ...c },
        geometry: { type: 'Point', coordinates: [c.lon, c.lat] },
      })),
    })
    setWildfireData(map, {
      type: 'FeatureCollection',
      features: snap.wildfires.map((w) => ({
        type: 'Feature',
        properties: { id: w.id, title: w.title, mag: w.magnitude, unit: w.magnitudeUnit, date: w.date },
        geometry: { type: 'Point', coordinates: [w.lon, w.lat] },
      })),
    })
    setEarthquakeData(map, {
      type: 'FeatureCollection',
      features: snap.earthquakes.map((q) => ({
        type: 'Feature',
        properties: { id: q.id, mag: q.mag, place: q.place, depth: q.depthKm, tsunami: q.tsunami, time: q.time },
        geometry: { type: 'Point', coordinates: [q.lon, q.lat] },
      })),
    })
  }, [map, epoch, snap])

  return null
}

// ---------- interactions (click popups) ----------
function bindPopup(
  map: maplibregl.Map,
  layerId: string,
  popup: maplibregl.Popup,
  html: (p: any) => string,
) {
  const onClick = (e: maplibregl.MapLayerMouseEvent) => {
    const f = e.features?.[0]
    if (!f || f.geometry.type !== 'Point') return
    const [lng, lat] = f.geometry.coordinates as [number, number]
    popup.setLngLat([lng, lat]).setHTML(html(f.properties || {})).addTo(map)
  }
  const onEnter = () => {
    map.getCanvas().style.cursor = 'pointer'
  }
  const onLeave = () => {
    map.getCanvas().style.cursor = ''
  }
  map.on('click', layerId, onClick)
  map.on('mouseenter', layerId, onEnter)
  map.on('mouseleave', layerId, onLeave)
  return () => {
    map.off('click', layerId, onClick)
    map.off('mouseenter', layerId, onEnter)
    map.off('mouseleave', layerId, onLeave)
  }
}

export function WeatherInteractions() {
  const { map } = useMapContext()
  const activeTool = useAppSelector((s) => s.ui.activeTool)

  useEffect(() => {
    if (!map || activeTool !== 'none') return
    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: true, offset: 12, maxWidth: '260px' })

    const cleanups = [
      bindPopup(map, LYR.cyclones, popup, (p) => {
        const cat = CAT_LABEL[String(p.category)] ?? p.classification
        return `<div style="font-size:11px">
          <div style="margin-bottom:2px"><strong>${esc(p.name)}</strong>${p.source === 'sim' ? ' <span style="color:#f59e0b">(sim)</span>' : ''}</div>
          <div style="color:#c084fc">${esc(cat)}</div>
          <div>${p.windKt != null ? esc(p.windKt) + ' kt winds' : ''}${p.pressureMb != null ? ' · ' + esc(p.pressureMb) + ' mb' : ''}</div>
          ${p.basin ? `<div style="color:#94a3b8">${esc(p.basin)}</div>` : ''}
        </div>`
      }),
      bindPopup(map, LYR.wildfires, popup, (p) => {
        return `<div style="font-size:11px">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px">
            <span style="width:8px;height:8px;border-radius:50%;background:#fb923c;display:inline-block"></span>
            <strong>${esc(p.title)}</strong>
          </div>
          ${p.mag != null ? `<div>${esc(p.mag)} ${esc(p.unit ?? 'acres')}</div>` : ''}
          <div style="color:#64748b;font-size:10px">Active wildfire · NASA EONET</div>
        </div>`
      }),
      bindPopup(map, LYR.earthquakes, popup, (p) => {
        const t = p.time ? new Date(Number(p.time)).toUTCString() : ''
        return `<div style="font-size:11px">
          <div style="margin-bottom:2px"><strong>M ${esc(p.mag ?? '?')}</strong> ${p.tsunami ? '<span style="color:#22d3ee">· tsunami</span>' : ''}</div>
          <div>${esc(p.place ?? '')}</div>
          <div style="color:#94a3b8">${p.depth != null ? 'depth ' + esc(p.depth) + ' km' : ''}</div>
          <div style="color:#64748b;font-size:10px">${esc(t)} · USGS</div>
        </div>`
      }),
      bindPopup(map, LYR.weatherTemp, popup, (p) => {
        return `<div style="font-size:11px">
          <div style="margin-bottom:2px"><strong>${p.temp != null ? esc(p.temp) + '°C' : 'Temp —'}</strong></div>
          <div>Wind ${p.windSpeed != null ? esc(Math.round(p.windSpeed)) + ' km/h ' + compass(p.windDir) : '—'}</div>
          <div>Cloud ${p.cloud != null ? esc(p.cloud) + '%' : '—'}</div>
          ${p.lightning ? '<div style="color:#fbbf24">⚡ convective (lightning risk)</div>' : ''}
        </div>`
      }),
    ]
    return () => {
      cleanups.forEach((c) => c())
      popup.remove()
    }
  }, [map, activeTool])

  return null
}
