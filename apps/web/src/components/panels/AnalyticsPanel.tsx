import { useMemo, useState } from 'react'
import { BarChart3, Download, Activity, Clock, Move, Grid3x3, TrendingUp, Layers, MapPin } from 'lucide-react'
import { PanelShell, SectionTitle } from '../ui'
import { useAppDispatch } from '../../store/hooks'
import { setActivePanel } from '../../store/uiSlice'
import { useMapContext } from '../../map/MapContext'
import { useAircraftSnapshot } from '../../data/aircraftStore'
import { useShipSnapshot } from '../../data/shipStore'
import { useTrainSnapshot } from '../../data/trainStore'
import { useFleetSnapshot } from '../../data/fleetStore'
import { useWeatherEvents } from '../../data/weatherStore'
import { useThreatSnapshot } from '../../data/cyberThreatStore'
import { useTrend } from '../../data/analyticsSampler'
import { BarChart, Donut, HBarChart, LineChart, CHART_PALETTE, type Datum } from '../charts/Charts'
import {
  altitudeBands,
  gridClusters,
  headingDistribution,
  magnitudeBands,
  quakeTimeline,
  shipsByCategory,
  speedHistogram,
  threatsByCountry,
  toCsvSection,
} from '../../lib/analytics'
import { cx } from '../../lib/cx'

function downloadBlob(content: string, type: string, name: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

export default function AnalyticsPanel() {
  const dispatch = useAppDispatch()
  const { map } = useMapContext()
  const ac = useAircraftSnapshot()
  const sh = useShipSnapshot()
  const tn = useTrainSnapshot()
  const fl = useFleetSnapshot()
  const wx = useWeatherEvents()
  const th = useThreatSnapshot()
  const trend = useTrend()
  const [clusterSet, setClusterSet] = useState<'quakes' | 'aircraft' | 'threats'>('quakes')
  const [trendMetric, setTrendMetric] = useState<'total' | 'aircraft' | 'ships' | 'threats' | 'quakes'>('total')

  const overview: Datum[] = [
    { label: 'Aircraft', value: ac.aircraft.length, color: CHART_PALETTE[0] },
    { label: 'Vessels', value: sh.ships.length, color: CHART_PALETTE[1] },
    { label: 'Trains', value: tn.trains.length, color: CHART_PALETTE[2] },
    { label: 'Fleet', value: fl.vehicles.length, color: CHART_PALETTE[3] },
  ].filter((d) => d.value > 0)

  const alt = useMemo(() => altitudeBands(ac.aircraft), [ac.aircraft])
  const mag = useMemo(() => magnitudeBands(wx.earthquakes), [wx.earthquakes])
  const shipsCat = useMemo(() => shipsByCategory(sh.ships), [sh.ships])
  const threatsCty = useMemo(() => threatsByCountry(th.points), [th.points])
  const timeline = useMemo(() => quakeTimeline(wx.earthquakes, Date.now()), [wx.earthquakes])
  const speed = useMemo(() => speedHistogram(ac.aircraft), [ac.aircraft])
  const heading = useMemo(() => headingDistribution(ac.aircraft), [ac.aircraft])

  const clusters = useMemo(() => {
    const src =
      clusterSet === 'quakes' ? wx.earthquakes : clusterSet === 'aircraft' ? ac.aircraft : th.points
    return gridClusters(src.map((p: any) => ({ lat: p.lat, lon: p.lon })))
  }, [clusterSet, wx.earthquakes, ac.aircraft, th.points])

  const trendPoints = trend.series.map((s) => s[trendMetric])

  const exportCsv = () => {
    const csv = [
      `# WorldEye Analytics — ${new Date().toISOString()}`,
      toCsvSection('Objects by type', overview),
      toCsvSection('Aircraft altitude (ft)', alt),
      toCsvSection('Earthquake magnitude', mag),
      shipsCat.length ? toCsvSection('Vessels by category', shipsCat) : '',
      threatsCty.length ? toCsvSection('Threats by country', threatsCty) : '',
      toCsvSection('Aircraft speed (kt)', speed.data),
      toCsvSection('Aircraft heading', heading),
    ].filter(Boolean).join('\n')
    downloadBlob(csv, 'text/csv', `worldeye-analytics-${Date.now()}.csv`)
  }
  const exportJson = () => {
    const json = JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        totals: { aircraft: ac.aircraft.length, ships: sh.ships.length, trains: tn.trains.length, fleet: fl.vehicles.length, earthquakes: wx.earthquakes.length, cyclones: wx.cyclones.length, threats: th.points.length },
        distributions: { altitude: alt, magnitude: mag, shipsByCategory: shipsCat, threatsByCountry: threatsCty, speed: speed.data, heading },
        clusters,
        trend: trend.series,
      },
      null,
      2,
    )
    downloadBlob(json, 'application/json', `worldeye-analytics-${Date.now()}.json`)
  }

  return (
    <PanelShell
      title="Analytics"
      subtitle="Module 16 · live data analysis"
      icon={<BarChart3 size={16} />}
      onClose={() => dispatch(setActivePanel(null))}
    >
      {/* overview */}
      <Section icon={<Layers size={12} />} title="Tracked objects">
        {overview.length ? <Donut data={overview} label="objects" /> : <Empty>No tracked objects yet.</Empty>}
      </Section>

      {/* distributions */}
      <Section icon={<BarChart3 size={12} />} title="Aircraft altitude (ft)">
        {ac.aircraft.length ? <BarChart data={alt} /> : <Empty>No aircraft in view.</Empty>}
      </Section>
      <Section icon={<Activity size={12} />} title="Earthquake magnitude (24h)">
        {wx.earthquakes.length ? <BarChart data={mag} /> : <Empty>No earthquake data yet.</Empty>}
      </Section>
      {shipsCat.length > 0 && (
        <Section icon={<BarChart3 size={12} />} title="Vessels by category">
          <Donut data={shipsCat} label="vessels" />
        </Section>
      )}
      {threatsCty.length > 0 && (
        <Section icon={<Grid3x3 size={12} />} title="Threats by country">
          <HBarChart data={threatsCty} />
        </Section>
      )}

      {/* timeline */}
      <Section icon={<Clock size={12} />} title="Seismic timeline (24h)">
        {wx.earthquakes.length ? <BarChart data={timeline} /> : <Empty>No events yet.</Empty>}
      </Section>

      {/* movement */}
      <Section icon={<Move size={12} />} title={`Aircraft movement · avg ${speed.avg} kt`}>
        {ac.aircraft.length ? (
          <>
            <BarChart data={speed.data} unit="kt" />
            <div className="mt-2 text-[10px] text-we-muted">Heading distribution</div>
            <BarChart data={heading} height={70} />
          </>
        ) : (
          <Empty>No aircraft in view.</Empty>
        )}
      </Section>

      {/* clusters */}
      <Section icon={<Grid3x3 size={12} />} title="Cluster analysis">
        <div className="mb-1.5 flex gap-1">
          {(['quakes', 'aircraft', 'threats'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setClusterSet(k)}
              className={cx('rounded border px-1.5 py-0.5 text-[10px] capitalize', clusterSet === k ? 'border-we-accent/60 bg-we-accent/15 text-we-accent' : 'border-we-border text-we-muted')}
            >
              {k}
            </button>
          ))}
        </div>
        {clusters.length ? (
          <div className="space-y-0.5">
            {clusters.map((c, i) => (
              <button
                key={i}
                onClick={() => map?.flyTo({ center: [c.lon, c.lat], zoom: 3, speed: 1.3 })}
                className="flex w-full items-center justify-between rounded px-1.5 py-1 text-left text-[11px] hover:bg-we-panel-2/60"
              >
                <span className="flex items-center gap-1 text-we-text"><MapPin size={10} className="text-we-accent" /> {c.lat.toFixed(0)}, {c.lon.toFixed(0)}</span>
                <span className="font-mono text-[10px] text-we-muted">{c.count}</span>
              </button>
            ))}
          </div>
        ) : (
          <Empty>No data for this set.</Empty>
        )}
      </Section>

      {/* trend */}
      <Section icon={<TrendingUp size={12} />} title="Session trend">
        <div className="mb-1.5 flex flex-wrap gap-1">
          {(['total', 'aircraft', 'ships', 'threats', 'quakes'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setTrendMetric(k)}
              className={cx('rounded border px-1.5 py-0.5 text-[10px] capitalize', trendMetric === k ? 'border-we-accent/60 bg-we-accent/15 text-we-accent' : 'border-we-border text-we-muted')}
            >
              {k}
            </button>
          ))}
        </div>
        <LineChart points={trendPoints} />
      </Section>

      {/* export */}
      <SectionTitle>Export</SectionTitle>
      <div className="flex gap-1.5">
        <button onClick={exportCsv} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-we-border bg-we-panel-2/40 px-2 py-1.5 text-[11px] text-we-text hover:border-we-border-2">
          <Download size={12} /> CSV
        </button>
        <button onClick={exportJson} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-we-border bg-we-panel-2/40 px-2 py-1.5 text-[11px] text-we-text hover:border-we-border-2">
          <Download size={12} /> JSON
        </button>
      </div>

      <p className="mt-3 text-[10px] leading-relaxed text-we-muted">
        Computed live from the data every module is streaming. Charts update as data arrives.
      </p>
    </PanelShell>
  )
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-2 rounded-lg border border-we-border bg-we-panel-2/30 p-2.5">
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-we-muted">
        <span className="text-we-accent">{icon}</span>
        {title}
      </div>
      {children}
    </div>
  )
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div className="py-3 text-center text-[10px] text-we-muted">{children}</div>
}
