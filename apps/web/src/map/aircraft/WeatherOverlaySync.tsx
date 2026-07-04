import { useEffect, useRef } from 'react'
import type { Map as MlMap } from 'maplibre-gl'
import { useMapContext } from '../MapContext'
import { useAppSelector } from '../../store/hooks'
import { SRC, LYR } from '../ids'

// Free RainViewer precipitation radar (no key). Toggled via the "Weather Radar"
// layer. A fuller weather module arrives in Module 9.

interface Frame {
  host: string
  path: string
}

async function loadLatestFrame(): Promise<Frame | null> {
  try {
    const res = await fetch('https://api.rainviewer.com/public/weather-maps.json')
    if (!res.ok) return null
    const j = await res.json()
    const past = j?.radar?.past
    if (j?.host && Array.isArray(past) && past.length) {
      return { host: j.host, path: past[past.length - 1].path }
    }
  } catch {
    /* offline / blocked — ignore */
  }
  return null
}

function removeWeather(map: MlMap) {
  if (map.getLayer(LYR.weatherRaster)) map.removeLayer(LYR.weatherRaster)
  if (map.getSource(SRC.weather)) map.removeSource(SRC.weather)
}

function addWeather(map: MlMap, frame: Frame, opacity: number) {
  removeWeather(map)
  map.addSource(SRC.weather, {
    type: 'raster',
    tiles: [`${frame.host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`],
    tileSize: 256,
    attribution: 'Radar © RainViewer',
  })
  // keep radar beneath the data overlays
  const before = map.getLayer(LYR.heatmap) ? LYR.heatmap : undefined
  map.addLayer(
    { id: LYR.weatherRaster, type: 'raster', source: SRC.weather, paint: { 'raster-opacity': opacity } },
    before,
  )
}

export function WeatherOverlaySync() {
  const { map } = useMapContext()
  const epoch = useAppSelector((s) => s.map.styleEpoch)
  const layer = useAppSelector((s) => s.layers.items.find((l) => l.id === 'weather-radar'))
  const visible = layer?.visible ?? false
  const opacity = layer?.opacity ?? 0.7

  const frameRef = useRef<Frame | null>(null)
  const opacityRef = useRef(opacity)
  useEffect(() => {
    opacityRef.current = opacity
  }, [opacity])

  // presence: add when visible (+ refresh every 5 min), remove when hidden
  useEffect(() => {
    if (!map || epoch === 0) return
    if (!visible) {
      removeWeather(map)
      return
    }
    let cancelled = false
    const ensure = async () => {
      if (!frameRef.current) frameRef.current = await loadLatestFrame()
      if (!cancelled && frameRef.current) addWeather(map, frameRef.current, opacityRef.current)
    }
    ensure()
    const id = window.setInterval(async () => {
      const f = await loadLatestFrame()
      if (f && !cancelled) {
        frameRef.current = f
        addWeather(map, f, opacityRef.current)
      }
    }, 5 * 60 * 1000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [map, epoch, visible])

  // opacity live update
  useEffect(() => {
    if (map && map.getLayer(LYR.weatherRaster)) {
      map.setPaintProperty(LYR.weatherRaster, 'raster-opacity', opacity)
    }
  }, [opacity, map])

  return null
}
