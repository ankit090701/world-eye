import { useEffect } from 'react'
import maplibregl from 'maplibre-gl'
import type { Feature } from 'geojson'
import { useMapContext } from '../MapContext'
import { useAppSelector } from '../../store/hooks'
import { useDomainInfraSnapshot } from '../../data/domainInfraStore'
import { setDomainInfraData, setDomainInfraLinkData } from '../mapLayers'
import { LYR } from '../ids'

// Data from public DNS / CT logs — escape before putting it in popup innerHTML.
function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const ROLE_LABEL: Record<string, string> = {
  apex: 'Apex / root',
  www: 'Web (www)',
  mail: 'Mail server',
  ns: 'Name server',
  sub: 'Subdomain',
}

export function DomainInfraSync() {
  const { map } = useMapContext()
  const epoch = useAppSelector((s) => s.map.styleEpoch)
  const snap = useDomainInfraSnapshot()

  useEffect(() => {
    if (!map || epoch === 0) return

    const features: Feature[] = snap.points.map((p) => ({
      type: 'Feature',
      properties: { host: p.host, ip: p.ip, role: p.role, org: p.org, country: p.country, city: p.city, as: p.as },
      geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
    }))
    setDomainInfraData(map, { type: 'FeatureCollection', features })

    // Star topology: link the apex node (fallback: first node) to every other node.
    const origin = snap.points.find((p) => p.role === 'apex') ?? snap.points[0] ?? null
    const links: Feature[] = []
    if (origin) {
      for (const p of snap.points) {
        if (p === origin) continue
        links.push({
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: [[origin.lon, origin.lat], [p.lon, p.lat]] },
        })
      }
    }
    setDomainInfraLinkData(map, { type: 'FeatureCollection', features: links })
  }, [map, epoch, snap])

  return null
}

export function DomainInfraInteractions() {
  const { map } = useMapContext()
  const activeTool = useAppSelector((s) => s.ui.activeTool)

  useEffect(() => {
    if (!map || activeTool !== 'none') return
    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: true, offset: 10, maxWidth: '260px' })
    const onClick = (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0]
      if (!f || f.geometry.type !== 'Point') return
      const p = f.properties || {}
      const [lng, lat] = f.geometry.coordinates as [number, number]
      const role = String(p.role ?? 'sub')
      const loc = [p.city, p.country].filter(Boolean).map(esc).join(', ')
      popup
        .setLngLat([lng, lat])
        .setHTML(
          `<div style="font-size:11px">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
              <span style="width:8px;height:8px;border-radius:50%;background:#a78bfa;display:inline-block"></span>
              <strong style="font-family:ui-monospace,monospace">${esc(p.host)}</strong>
            </div>
            <div style="color:#c4b5fd">${esc(ROLE_LABEL[role] ?? role)}</div>
            <div style="font-family:ui-monospace,monospace">${esc(p.ip)}</div>
            <div style="color:#94a3b8">${esc(p.org ?? '')}</div>
            ${loc ? `<div style="color:#64748b">${loc}</div>` : ''}
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
    map.on('click', LYR.domainInfra, onClick)
    map.on('mouseenter', LYR.domainInfra, onEnter)
    map.on('mouseleave', LYR.domainInfra, onLeave)
    return () => {
      map.off('click', LYR.domainInfra, onClick)
      map.off('mouseenter', LYR.domainInfra, onEnter)
      map.off('mouseleave', LYR.domainInfra, onLeave)
      popup.remove()
    }
  }, [map, activeTool])

  return null
}
