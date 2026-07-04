import { useCallback, useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import type { Feature } from 'geojson'
import { useMapContext } from '../MapContext'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { groupLoading, groupMeta, selectSat } from '../../store/satelliteSlice'
import { satelliteStore, useSatSnapshot } from '../../data/satelliteStore'
import { fetchTle } from '../../api/satelliteApi'
import {
  buildSatrec,
  orbitTrack,
  orbitalParams,
  propagateOne,
  type SatRec,
} from '../../lib/satprop'
import { setSatOrbitData, setSatelliteData } from '../mapLayers'
import { LYR } from '../ids'
import type { SatGroup, SatPosition } from '../../types'

interface RegEntry {
  satrec: SatRec
  name: string
  group: SatGroup
  periodMin: number | null
  inclinationDeg: number | null
}

const GROUPS: SatGroup[] = ['iss', 'active', 'starlink', 'debris', 'launches']
const LAYER_OF: Record<SatGroup, string> = {
  iss: 'sat-iss',
  active: 'sat-active',
  starlink: 'sat-starlink',
  debris: 'sat-debris',
  launches: 'sat-launches',
}

function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function SatelliteEngine() {
  const dispatch = useAppDispatch()
  const vis = useAppSelector((s) => s.layers.items)
  const selectedId = useAppSelector((s) => s.satellites.selectedId)

  const visOf = (id: string) => vis.find((l) => l.id === id)?.visible ?? false
  const visIss = visOf('sat-iss')
  const visActive = visOf('sat-active')
  const visStarlink = visOf('sat-starlink')
  const visDebris = visOf('sat-debris')
  const visLaunches = visOf('sat-launches')

  const regRef = useRef<Map<number, RegEntry>>(new Map())
  const loadedRef = useRef<Set<SatGroup>>(new Set())
  const loadingRef = useRef<Set<SatGroup>>(new Set())
  const selectedRef = useRef<number | null>(selectedId)

  // Propagate everything currently in the registry to "now" and publish.
  const tick = useCallback(() => {
    const now = new Date()
    const sel = selectedRef.current
    const positions: SatPosition[] = []
    let selEntry: RegEntry | null = null
    for (const [id, e] of regRef.current) {
      const fix = propagateOne(e.satrec, now)
      if (!fix) continue
      const selected = id === sel
      if (selected) selEntry = e
      positions.push({
        noradId: id,
        name: e.name,
        group: e.group,
        lat: fix.lat,
        lon: fix.lon,
        altKm: fix.altKm,
        speedKmS: fix.speedKmS,
        periodMin: e.periodMin,
        inclinationDeg: e.inclinationDeg,
        selected,
      })
    }
    const orbit = selEntry ? orbitTrack(selEntry.satrec, now, selEntry.periodMin) : []
    satelliteStore.update(positions, orbit)
  }, [])

  // keep the selection ref current + recompute immediately on change
  useEffect(() => {
    selectedRef.current = selectedId
    tick()
  }, [selectedId, tick])

  // 1 Hz propagation loop
  useEffect(() => {
    tick()
    const iv = window.setInterval(tick, 1000)
    return () => window.clearInterval(iv)
  }, [tick])

  // load TLEs when a group becomes visible; drop them when hidden
  useEffect(() => {
    const wanted: Record<SatGroup, boolean> = {
      iss: visIss,
      active: visActive,
      starlink: visStarlink,
      debris: visDebris,
      launches: visLaunches,
    }
    for (const g of GROUPS) {
      if (wanted[g] && !loadedRef.current.has(g) && !loadingRef.current.has(g)) {
        loadingRef.current.add(g)
        dispatch(groupLoading({ group: g, loading: true }))
        fetchTle(g)
          .then((resp) => {
            let added = 0
            for (const rec of resp.sats) {
              const satrec = buildSatrec(rec)
              if (!satrec) continue
              const { periodMin, inclinationDeg } = orbitalParams(satrec)
              regRef.current.set(rec.noradId, { satrec, name: rec.name, group: g, periodMin, inclinationDeg })
              added++
            }
            loadedRef.current.add(g)
            loadingRef.current.delete(g)
            dispatch(groupMeta({ group: g, count: added, source: resp.source }))
            tick()
          })
          .catch(() => {
            loadingRef.current.delete(g)
            dispatch(groupLoading({ group: g, loading: false }))
          })
      } else if (!wanted[g] && loadedRef.current.has(g)) {
        for (const [id, e] of regRef.current) if (e.group === g) regRef.current.delete(id)
        loadedRef.current.delete(g)
        tick()
      }
    }
  }, [visIss, visActive, visStarlink, visDebris, visLaunches, dispatch, tick])

  return null
}

export function SatelliteSync() {
  const { map } = useMapContext()
  const epoch = useAppSelector((s) => s.map.styleEpoch)
  const snap = useSatSnapshot()

  useEffect(() => {
    if (!map || epoch === 0) return
    const features: Feature[] = snap.positions.map((p) => ({
      type: 'Feature',
      properties: {
        noradId: p.noradId,
        name: p.name,
        group: p.group,
        altKm: Math.round(p.altKm),
        speed: Number(p.speedKmS.toFixed(2)),
        selected: p.selected,
      },
      geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
    }))
    setSatelliteData(map, { type: 'FeatureCollection', features })

    const orbitFeatures: Feature[] = snap.orbit.map((seg) => ({
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: seg },
    }))
    setSatOrbitData(map, { type: 'FeatureCollection', features: orbitFeatures })
  }, [map, epoch, snap])

  return null
}

export function SatelliteInteractions() {
  const { map } = useMapContext()
  const dispatch = useAppDispatch()
  const activeTool = useAppSelector((s) => s.ui.activeTool)

  useEffect(() => {
    if (!map || activeTool !== 'none') return
    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: true, offset: 10, maxWidth: '240px' })
    const layerIds = [LYR.satIss, LYR.satActive, LYR.satStarlink, LYR.satDebris, LYR.satLaunches]

    const onClick = (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0]
      if (!f || f.geometry.type !== 'Point') return
      const p = f.properties || {}
      const [lng, lat] = f.geometry.coordinates as [number, number]
      dispatch(selectSat(Number(p.noradId)))
      popup
        .setLngLat([lng, lat])
        .setHTML(
          `<div style="font-size:11px">
            <div style="margin-bottom:2px"><strong>${esc(p.name)}</strong></div>
            <div style="color:#94a3b8">NORAD ${esc(p.noradId)} · ${esc(p.group)}</div>
            <div>alt ${esc(p.altKm)} km · ${esc(p.speed)} km/s</div>
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
    for (const id of layerIds) {
      map.on('click', id, onClick)
      map.on('mouseenter', id, onEnter)
      map.on('mouseleave', id, onLeave)
    }
    return () => {
      for (const id of layerIds) {
        map.off('click', id, onClick)
        map.off('mouseenter', id, onEnter)
        map.off('mouseleave', id, onLeave)
      }
      popup.remove()
    }
  }, [map, activeTool, dispatch])

  return null
}
