import { Info, Activity, AlertTriangle } from 'lucide-react'
import { PanelShell, SectionTitle } from '../ui'
import { useAppDispatch } from '../../store/hooks'
import { setActivePanel } from '../../store/uiSlice'
import { useVisibleSignals } from '../../hooks/useVisibleSignals'
import { CATEGORIES, CATEGORY_COLORS } from '../../data/activitySimulator'
import type { ActivityCategory } from '../../types'

const CATEGORY_LABEL: Record<ActivityCategory, string> = {
  signal: 'Signals',
  transit: 'Transit',
  event: 'Events',
  sensor: 'Sensors',
  alert: 'Alerts',
}

export default function InfoPanel() {
  const dispatch = useAppDispatch()
  const visible = useVisibleSignals()

  const counts = CATEGORIES.reduce(
    (acc, c) => {
      acc[c] = 0
      return acc
    },
    {} as Record<ActivityCategory, number>,
  )
  for (const s of visible) counts[s.category]++
  const alerts = counts.alert

  return (
    <PanelShell
      title="Overview"
      subtitle="Legend, live statistics & sources"
      icon={<Info size={16} />}
      onClose={() => dispatch(setActivePanel(null))}
    >
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Visible signals" value={visible.length.toLocaleString()} icon={<Activity size={13} />} />
        <Stat
          label="Active alerts"
          value={alerts.toLocaleString()}
          icon={<AlertTriangle size={13} />}
          danger={alerts > 0}
        />
      </div>

      <SectionTitle>Legend · by category</SectionTitle>
      <div className="space-y-1.5">
        {CATEGORIES.map((c) => (
          <div key={c} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: CATEGORY_COLORS[c] }}
            />
            <span className="flex-1 text-xs text-we-text">{CATEGORY_LABEL[c]}</span>
            <span className="font-mono text-[11px] text-we-muted">{counts[c]}</span>
          </div>
        ))}
      </div>

      <SectionTitle>Heatmap scale</SectionTitle>
      <div className="h-2.5 w-full rounded-full bg-gradient-to-r from-[#06b6d4] via-[#8b5cf6] to-[#f43f5e]" />
      <div className="mt-1 flex justify-between text-[10px] text-we-muted">
        <span>low density</span>
        <span>high density</span>
      </div>

      <SectionTitle>About the activity layer</SectionTitle>
      <p className="text-[11px] leading-relaxed text-we-muted">
        The heatmap and signal points show a{' '}
        <span className="font-medium text-we-text">simulated demo feed</span> that drives the
        timeline, playback and live updates. Live tracking data (aircraft, ships, trains, weather…)
        renders on its own layers of the same map.
      </p>

      <SectionTitle>Data & attribution</SectionTitle>
      <ul className="space-y-1 text-[10px] leading-relaxed text-we-muted">
        <li>Basemaps: © OpenStreetMap contributors, © CARTO, OpenFreeMap</li>
        <li>Satellite imagery: © Esri, Maxar, Earthstar Geographics</li>
        <li>Place search: OpenStreetMap Nominatim</li>
        <li className="text-we-muted/70">All providers are free & require no API key.</li>
      </ul>
    </PanelShell>
  )
}

function Stat({
  label,
  value,
  icon,
  danger,
}: {
  label: string
  value: string
  icon: React.ReactNode
  danger?: boolean
}) {
  return (
    <div className="rounded-lg border border-we-border bg-we-panel-2/40 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-we-muted">
        {icon}
        {label}
      </div>
      <div
        className={`mt-1 font-mono text-lg font-semibold ${danger ? 'text-we-danger' : 'text-we-text'}`}
      >
        {value}
      </div>
    </div>
  )
}
