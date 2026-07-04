import { useEffect } from 'react'
import maplibregl from 'maplibre-gl'
import type { Feature } from 'geojson'
import { useMapContext } from '../MapContext'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { threatFeedOk } from '../../store/cyberSlice'
import { cyberThreatStore, useThreatSnapshot } from '../../data/cyberThreatStore'
import { fetchCyberThreats } from '../../api/cyberApi'
import { setCyberThreatData } from '../mapLayers'
import { LYR } from '../ids'

function useThreatsEnabled(): boolean {
  return useAppSelector((s) => s.layers.items.find((l) => l.id === 'cyber-threats')?.visible ?? false)
}

// Escape values before putting them in popup innerHTML. The data comes from
// external feeds (abuse.ch / ip-api over HTTP), so treat it as untrusted.
function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function CyberThreatEngine() {
  const dispatch = useAppDispatch()
  const enabled = useThreatsEnabled()

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    const poll = async () => {
      try {
        const resp = await fetchCyberThreats()
        if (cancelled) return
        cyberThreatStore.update(resp)
        dispatch(threatFeedOk({ source: resp.source, count: resp.count }))
      } catch {
        /* keep last */
      }
    }
    poll()
    const id = window.setInterval(poll, 60000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [enabled, dispatch])

  return null
}

export function CyberThreatSync() {
  const { map } = useMapContext()
  const epoch = useAppSelector((s) => s.map.styleEpoch)
  const snap = useThreatSnapshot()

  useEffect(() => {
    if (!map || epoch === 0) return
    const features: Feature[] = snap.points.map((p) => ({
      type: 'Feature',
      properties: { ip: p.ip, malware: p.malware, country: p.country, as: p.as },
      geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
    }))
    setCyberThreatData(map, { type: 'FeatureCollection', features })
  }, [map, epoch, snap])

  return null
}

export function CyberThreatInteractions() {
  const { map } = useMapContext()
  const activeTool = useAppSelector((s) => s.ui.activeTool)

  useEffect(() => {
    if (!map || activeTool !== 'none') return
    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: true, offset: 10, maxWidth: '240px' })
    const onClick = (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0]
      if (!f || f.geometry.type !== 'Point') return
      const p = f.properties || {}
      const [lng, lat] = f.geometry.coordinates as [number, number]
      popup
        .setLngLat([lng, lat])
        .setHTML(
          `<div style="font-size:11px">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
              <span style="width:8px;height:8px;border-radius:50%;background:#f43f5e;display:inline-block"></span>
              <strong>${esc(p.malware ?? 'Malicious host')}</strong>
            </div>
            <div style="font-family:ui-monospace,monospace">${esc(p.ip)}</div>
            <div style="color:#94a3b8">${esc(p.country)}${p.as ? ' · ' + esc(p.as) : ''}</div>
            <div style="color:#64748b;font-size:10px;margin-top:3px">Botnet C2 · abuse.ch Feodo Tracker</div>
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
    map.on('click', LYR.cyberThreats, onClick)
    map.on('mouseenter', LYR.cyberThreats, onEnter)
    map.on('mouseleave', LYR.cyberThreats, onLeave)
    return () => {
      map.off('click', LYR.cyberThreats, onClick)
      map.off('mouseenter', LYR.cyberThreats, onEnter)
      map.off('mouseleave', LYR.cyberThreats, onLeave)
      popup.remove()
    }
  }, [map, activeTool])

  return null
}
