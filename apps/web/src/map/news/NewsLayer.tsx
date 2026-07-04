import { useEffect } from 'react'
import maplibregl from 'maplibre-gl'
import type { Feature } from 'geojson'
import { useMapContext } from '../MapContext'
import { useAppSelector } from '../../store/hooks'
import { newsMapStore, useNewsMap } from '../../data/newsStore'
import { fetchNewsMap } from '../../api/newsApi'
import { setNewsData } from '../mapLayers'
import { LYR } from '../ids'

function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function useNewsEnabled(): boolean {
  return useAppSelector((s) => s.layers.items.find((l) => l.id === 'news-hotspots')?.visible ?? false)
}

export function NewsEngine() {
  const enabled = useNewsEnabled()
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    const poll = async () => {
      try {
        const r = await fetchNewsMap()
        if (!cancelled) newsMapStore.update(r.points, r.source)
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

export function NewsSync() {
  const { map } = useMapContext()
  const epoch = useAppSelector((s) => s.map.styleEpoch)
  const snap = useNewsMap()

  useEffect(() => {
    if (!map || epoch === 0) return
    const features: Feature[] = snap.points.map((p) => ({
      type: 'Feature',
      properties: { place: p.place, count: p.count, category: p.category, title: p.title, url: p.url },
      geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
    }))
    setNewsData(map, { type: 'FeatureCollection', features })
  }, [map, epoch, snap])

  return null
}

export function NewsInteractions() {
  const { map } = useMapContext()
  const activeTool = useAppSelector((s) => s.ui.activeTool)

  useEffect(() => {
    if (!map || activeTool !== 'none') return
    const popup = new maplibregl.Popup({ closeButton: true, closeOnClick: true, offset: 12, maxWidth: '280px' })
    const onClick = (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0]
      if (!f || f.geometry.type !== 'Point') return
      const p = f.properties || {}
      const [lng, lat] = f.geometry.coordinates as [number, number]
      const url = String(p.url ?? '')
      const safeHref = /^https?:\/\//i.test(url) ? url : '#'
      popup
        .setLngLat([lng, lat])
        .setHTML(
          `<div style="font-size:11px">
            <div style="margin-bottom:2px"><strong>${esc(p.place)}</strong> <span style="color:#94a3b8">· ${esc(p.count)} stor${p.count === 1 ? 'y' : 'ies'} · ${esc(p.category)}</span></div>
            <a href="${esc(safeHref)}" target="_blank" rel="noopener noreferrer" style="color:#38bdf8;text-decoration:none">${esc(p.title)} ↗</a>
          </div>`,
        )
        .addTo(map)
    }
    const onEnter = () => {
      map.getCanvas().style.cursor = 'pointer'
    }
    const onLeave = () => {
      map.getCanvas().style.cursor = ''
    }
    map.on('click', LYR.newsPoints, onClick)
    map.on('mouseenter', LYR.newsPoints, onEnter)
    map.on('mouseleave', LYR.newsPoints, onLeave)
    return () => {
      map.off('click', LYR.newsPoints, onClick)
      map.off('mouseenter', LYR.newsPoints, onEnter)
      map.off('mouseleave', LYR.newsPoints, onLeave)
      popup.remove()
    }
  }, [map, activeTool])

  return null
}
