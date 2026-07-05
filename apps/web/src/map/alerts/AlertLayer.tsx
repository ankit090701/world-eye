import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import type { Feature } from 'geojson'
import { useMapContext } from '../MapContext'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { addEvent, newId } from '../../store/alertsSlice'
import { setToast } from '../../store/uiSlice'
import { useAircraftSnapshot } from '../../data/aircraftStore'
import { useFleetSnapshot } from '../../data/fleetStore'
import { useWeatherEvents } from '../../data/weatherStore'
import { useThreatSnapshot } from '../../data/cyberThreatStore'
import { circlePolygon, matchRule, type EvalContext } from '../../lib/alertEval'
import { deliverAlert } from '../../api/alertsApi'
import { setAlertEventData, setAlertZoneData } from '../mapLayers'
import { LYR } from '../ids'
import type { AlertEvent, AlertRule, ChannelConfig } from '../../types'

const COOLDOWN_MS = 5 * 60 * 1000
// key (ruleId:objectKey) → last fired ms; module-level so it survives re-renders
const cooldown = new Map<string, number>()

function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
const sevIcon = (s: string) => (s === 'critical' ? '🔴' : s === 'warning' ? '🟠' : '🔵')

function deliver(rule: AlertRule, ev: AlertEvent, channels: ChannelConfig) {
  const text = `WorldEye alert — ${ev.title}\n${ev.detail}${ev.lat != null && ev.lon != null ? `\n${ev.lat.toFixed(3)}, ${ev.lon.toFixed(3)}` : ''}`
  for (const ch of rule.channels) {
    if (ch === 'slack' && channels.slack.enabled && channels.slack.url) deliverAlert('slack', channels.slack.url, text)
    else if (ch === 'discord' && channels.discord.enabled && channels.discord.url) deliverAlert('discord', channels.discord.url, text)
    else if (ch === 'webhook' && channels.webhook.enabled && channels.webhook.url) deliverAlert('webhook', channels.webhook.url, text)
    // 'inapp' → feed + toast + marker (handled below); 'email'/'sms' → provider stub
  }
}

export function AlertEngine() {
  const dispatch = useAppDispatch()
  const rules = useAppSelector((s) => s.alerts.rules)
  const channels = useAppSelector((s) => s.alerts.channels)
  const ac = useAircraftSnapshot()
  const fl = useFleetSnapshot()
  const wx = useWeatherEvents()
  const th = useThreatSnapshot()

  const channelsRef = useRef(channels)
  channelsRef.current = channels

  useEffect(() => {
    const ctx: EvalContext = {
      aircraft: ac.aircraft,
      vehicles: fl.vehicles,
      cyclones: wx.cyclones,
      earthquakes: wx.earthquakes,
      threats: th.points,
    }
    const now = Date.now()
    for (const rule of rules) {
      if (!rule.enabled) continue
      // cap per rule per tick so a broad rule can't flood the feed / webhooks
      for (const c of matchRule(rule, ctx).slice(0, 25)) {
        const key = `${rule.id}:${c.objectKey}`
        if (now - (cooldown.get(key) ?? 0) < COOLDOWN_MS) continue
        cooldown.set(key, now)
        const ev: AlertEvent = {
          id: newId(),
          ruleId: rule.id,
          ruleName: rule.name,
          type: rule.type,
          severity: rule.severity,
          title: c.title,
          detail: c.detail,
          lat: c.lat,
          lon: c.lon,
          time: now,
        }
        dispatch(addEvent(ev))
        dispatch(setToast(`${sevIcon(rule.severity)} ${c.title}`))
        deliver(rule, ev, channelsRef.current)
      }
    }
    // bound the cooldown map
    if (cooldown.size > 5000) cooldown.clear()
  }, [ac.updatedAt, fl.updatedAt, wx.updatedAt, th.updatedAt, rules, dispatch])

  return null
}

export function AlertZoneSync() {
  const { map } = useMapContext()
  const epoch = useAppSelector((s) => s.map.styleEpoch)
  const rules = useAppSelector((s) => s.alerts.rules)

  useEffect(() => {
    if (!map || epoch === 0) return
    const features: Feature[] = rules
      .filter((r) => r.type === 'geo' && r.params.lat != null && r.params.lon != null && r.params.radiusKm)
      .map((r) => ({
        type: 'Feature',
        properties: { name: r.name, enabled: r.enabled },
        geometry: { type: 'Polygon', coordinates: circlePolygon(r.params.lat!, r.params.lon!, r.params.radiusKm!) },
      }))
    setAlertZoneData(map, { type: 'FeatureCollection', features })
  }, [map, epoch, rules])

  return null
}

export function AlertEventSync() {
  const { map } = useMapContext()
  const epoch = useAppSelector((s) => s.map.styleEpoch)
  const events = useAppSelector((s) => s.alerts.events)

  useEffect(() => {
    if (!map || epoch === 0) return
    const features: Feature[] = events
      .filter((e) => e.lat != null && e.lon != null)
      .slice(0, 50)
      .map((e) => ({
        type: 'Feature',
        properties: { title: e.title, detail: e.detail, severity: e.severity, time: e.time },
        geometry: { type: 'Point', coordinates: [e.lon as number, e.lat as number] },
      }))
    setAlertEventData(map, { type: 'FeatureCollection', features })
  }, [map, epoch, events])

  return null
}

export function AlertInteractions() {
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
      const t = p.time ? new Date(Number(p.time)).toLocaleTimeString() : ''
      popup
        .setLngLat([lng, lat])
        .setHTML(
          `<div style="font-size:11px">
            <div style="margin-bottom:2px"><strong>${esc(p.title)}</strong></div>
            <div style="color:#94a3b8">${esc(p.detail)}</div>
            <div style="color:#64748b;font-size:10px;margin-top:2px">${esc(t)}</div>
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
    map.on('click', LYR.alertEvents, onClick)
    map.on('mouseenter', LYR.alertEvents, onEnter)
    map.on('mouseleave', LYR.alertEvents, onLeave)
    return () => {
      map.off('click', LYR.alertEvents, onClick)
      map.off('mouseenter', LYR.alertEvents, onEnter)
      map.off('mouseleave', LYR.alertEvents, onLeave)
      popup.remove()
    }
  }, [map, activeTool])

  return null
}
