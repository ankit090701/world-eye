import maplibregl from 'maplibre-gl'
import {
  ShieldAlert,
  Search,
  Loader2,
  MapPin,
  Globe,
  Server,
  Network,
  ScrollText,
  ShieldCheck,
  Lock,
  Ban,
  Cloud,
} from 'lucide-react'
import { PanelShell, SectionTitle, Switch } from '../ui'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { setActivePanel, setToast } from '../../store/uiSlice'
import { clearReport, lookupError, lookupOk, lookupStart, setQuery } from '../../store/cyberSlice'
import { toggleLayer } from '../../store/layersSlice'
import { useMapContext } from '../../map/MapContext'
import { fetchCyberLookup } from '../../api/cyberApi'
import type { CyberReport } from '../../types'
import { cx } from '../../lib/cx'

let cyberMarker: maplibregl.Marker | null = null
// Monotonic sequence so a slow older lookup can't overwrite a newer one.
let lookupSeq = 0
function dropMarker(map: maplibregl.Map, lng: number, lat: number, danger: boolean) {
  cyberMarker?.remove()
  const el = document.createElement('div')
  el.className = 'we-search-marker'
  if (danger) el.style.background = '#f43f5e'
  cyberMarker = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map)
}

const EXAMPLES = ['8.8.8.8', 'github.com', 'AS15169', '1.1.1.1']

export default function CyberPanel() {
  const dispatch = useAppDispatch()
  const { map } = useMapContext()
  const query = useAppSelector((s) => s.cyber.query)
  const report = useAppSelector((s) => s.cyber.report)
  const loading = useAppSelector((s) => s.cyber.loading)
  const error = useAppSelector((s) => s.cyber.error)
  const threatSource = useAppSelector((s) => s.cyber.threatSource)
  const threatCount = useAppSelector((s) => s.cyber.threatCount)
  const threatsOn = useAppSelector((s) => s.layers.items.find((l) => l.id === 'cyber-threats')?.visible ?? false)

  const doLookup = async (raw: string) => {
    const q = raw.trim()
    if (!q) return
    const seq = ++lookupSeq
    dispatch(setQuery(q))
    dispatch(lookupStart())
    try {
      const r = await fetchCyberLookup(q)
      if (seq !== lookupSeq) return // a newer lookup superseded this one
      dispatch(lookupOk(r))
      if (map && r.geo?.lat != null && r.geo?.lon != null) {
        dropMarker(map, r.geo.lon, r.geo.lat, r.threat.listed)
        map.flyTo({ center: [r.geo.lon, r.geo.lat], zoom: Math.max(map.getZoom(), 4), speed: 1.3 })
      }
    } catch (err) {
      if (seq !== lookupSeq) return
      const msg = err instanceof Error && err.message && !err.message.startsWith('HTTP') ? err.message : null
      dispatch(lookupError(msg || 'Lookup failed — is the WorldEye API running?'))
    }
  }

  return (
    <PanelShell
      title="Cyber Intelligence"
      subtitle="Module 7 · IP / domain / ASN OSINT"
      icon={<ShieldAlert size={16} />}
      onClose={() => dispatch(setActivePanel(null))}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          doLookup(query)
        }}
        className="space-y-2"
      >
        <div className="flex items-center gap-2 rounded-lg border border-we-border bg-we-panel-2/50 px-2.5 py-2 focus-within:border-we-accent/60">
          <Search size={14} className="text-we-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => dispatch(setQuery(e.target.value))}
            placeholder="IP · domain · ASN  (e.g. 8.8.8.8)"
            className="w-full bg-transparent font-mono text-xs text-we-text placeholder:text-we-muted focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-we-accent/60 bg-we-accent/10 px-3 py-2 text-xs font-medium text-we-text hover:shadow-glow disabled:opacity-40"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} className="text-we-accent" />}
          {loading ? 'Investigating…' : 'Investigate'}
        </button>
      </form>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => doLookup(ex)}
            className="rounded-full border border-we-border px-2 py-0.5 font-mono text-[10px] text-we-muted hover:border-we-border-2 hover:text-we-text"
          >
            {ex}
          </button>
        ))}
      </div>

      {error && <div className="mt-3 text-[11px] text-we-warn">{error}</div>}

      {report && <Report report={report} onLocate={() => report.geo?.lat != null && report.geo?.lon != null && map && (dropMarker(map, report.geo.lon, report.geo.lat, report.threat.listed), map.flyTo({ center: [report.geo.lon, report.geo.lat], zoom: 5 }))} />}

      {/* threat feed */}
      <SectionTitle>Global threat feed</SectionTitle>
      <div className="flex items-center justify-between rounded-lg border border-we-border bg-we-panel-2/40 px-3 py-2">
        <div className="min-w-0">
          <div className="text-xs text-we-text">Malicious infrastructure</div>
          <div className="text-[10px] text-we-muted">
            {threatCount} botnet C2 hosts · {threatSource === 'live' ? 'live (abuse.ch)' : threatSource === 'sim' ? 'sample' : '—'}
          </div>
        </div>
        <Switch checked={threatsOn} onChange={() => dispatch(toggleLayer('cyber-threats'))} />
      </div>

      <p className="mt-4 text-[10px] leading-relaxed text-we-muted">
        Sources: ip-api · RDAP · Google DoH · crt.sh · abuse.ch Feodo · Tor — all free, no keys.
        Active port scanning is disabled (authorized targets only).
      </p>
    </PanelShell>
  )
}

function Report({ report, onLocate }: { report: CyberReport; onLocate: () => void }) {
  const dispatch = useAppDispatch()
  const t = report.threat
  return (
    <div className="mt-3 space-y-3">
      {/* header + verdict */}
      <div className="rounded-xl border border-we-border bg-we-panel-2/40 p-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <div className="truncate font-mono text-sm font-semibold text-we-text">{report.query}</div>
            <div className="text-[10px] uppercase tracking-wide text-we-muted">
              {report.kind}
              {report.resolvedIp && report.kind === 'domain' && ` → ${report.resolvedIp}`}
            </div>
          </div>
          <span
            className={cx(
              'flex items-center gap-1 rounded px-2 py-1 text-[10px] font-semibold',
              t.listed ? 'bg-we-danger/20 text-we-danger' : 'bg-we-good/15 text-we-good',
            )}
          >
            {t.listed ? <ShieldAlert size={12} /> : <ShieldCheck size={12} />}
            {t.listed ? 'LISTED' : 'No known threat'}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {t.feodo.listed && <Flag danger label={`C2: ${t.feodo.malware ?? 'malware'}`} />}
          {t.tor && <Flag danger label="Tor exit" />}
          {t.proxy && <Flag label="Proxy / VPN" />}
          {t.hosting && <Flag label="Hosting / DC" />}
          {!t.listed && !t.proxy && !t.hosting && <span className="text-[10px] text-we-muted">No flags raised.</span>}
        </div>
      </div>

      {/* geolocation */}
      {report.geo && (
        <Section icon={<Globe size={13} />} title="Geolocation">
          <Row label="Country" value={report.geo.country} />
          <Row label="City" value={report.geo.city} />
          <Row label="ISP" value={report.geo.isp} />
          <Row label="Org" value={report.geo.org} />
          {report.cloud && <Row label="Cloud" value={report.cloud} icon={<Cloud size={11} />} />}
          {report.geo.lat != null && report.geo.lon != null && (
            <button onClick={onLocate} className="mt-1 flex items-center gap-1 text-[11px] text-we-accent hover:underline">
              <MapPin size={11} /> Locate on map
            </button>
          )}
        </Section>
      )}

      {/* asn */}
      {report.asn?.asn && (
        <Section icon={<Network size={13} />} title="ASN">
          <Row label="AS" value={report.asn.asn} />
          <Row label="Name" value={report.asn.name} />
          <Row label="Country" value={report.asn.country} />
        </Section>
      )}

      {/* whois / rdap */}
      {report.rdap && (
        <Section icon={<ScrollText size={13} />} title="WHOIS / RDAP">
          <Row label="Network" value={report.rdap.name} />
          <Row label="CIDR" value={report.rdap.cidr} />
          <Row label="Range" value={report.rdap.startAddress ? `${report.rdap.startAddress} – ${report.rdap.endAddress}` : null} />
          <Row label="Country" value={report.rdap.country} />
          {report.rdap.entities.slice(0, 3).map((e, i) => (
            <Row key={i} label={e.role} value={e.name} />
          ))}
        </Section>
      )}

      {/* dns */}
      {report.dns && (
        <Section icon={<Server size={13} />} title="DNS records">
          <RecordRow label="A" values={report.dns.A} />
          <RecordRow label="AAAA" values={report.dns.AAAA} />
          <RecordRow label="MX" values={report.dns.MX} />
          <RecordRow label="NS" values={report.dns.NS} />
          <RecordRow label="TXT" values={report.dns.TXT} />
          {report.ptr && <Row label="PTR" value={report.ptr} />}
        </Section>
      )}

      {/* certs */}
      {report.certs.length > 0 && (
        <Section icon={<Lock size={13} />} title={`Certificates (${report.certs.length})`}>
          {report.certs.slice(0, 4).map((c, i) => (
            <div key={i} className="border-t border-we-border/50 py-1 first:border-0">
              <div className="truncate font-mono text-[11px] text-we-text">{c.commonName || '—'}</div>
              <div className="text-[10px] text-we-muted">
                {c.issuer || 'CA'} · until {c.notAfter ? c.notAfter.slice(0, 10) : '—'}
              </div>
            </div>
          ))}
        </Section>
      )}

      {/* ports (gated) */}
      <Section icon={<Ban size={13} />} title="Open ports">
        <p className="text-[10px] leading-relaxed text-we-muted">{report.ports.note}</p>
      </Section>

      {report.errors.length > 0 && (
        <div className="text-[10px] text-we-warn">{report.errors.join(' · ')}</div>
      )}

      <button onClick={() => dispatch(clearReport())} className="text-[10px] text-we-muted hover:text-we-text">
        clear report
      </button>
    </div>
  )
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-we-border bg-we-panel-2/30 p-2.5">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-we-muted">
        <span className="text-we-accent">{icon}</span>
        {title}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}
function Row({ label, value, icon }: { label: string; value: string | null | undefined; icon?: React.ReactNode }) {
  if (!value) return null
  return (
    <div className="flex items-center justify-between gap-2 text-[11px]">
      <span className="flex items-center gap-1 capitalize text-we-muted">
        {icon}
        {label}
      </span>
      <span className="truncate text-right font-mono text-we-text">{value}</span>
    </div>
  )
}
function RecordRow({ label, values }: { label: string; values: string[] }) {
  if (!values.length) return null
  return (
    <div className="flex items-start justify-between gap-2 text-[11px]">
      <span className="text-we-muted">{label}</span>
      <span className="min-w-0 flex-1 truncate text-right font-mono text-[10px] text-we-text" title={values.join(', ')}>
        {values.slice(0, 3).join(', ')}
        {values.length > 3 ? ` +${values.length - 3}` : ''}
      </span>
    </div>
  )
}
function Flag({ label, danger }: { label: string; danger?: boolean }) {
  return (
    <span
      className={cx(
        'rounded px-1.5 py-0.5 text-[9px] font-medium',
        danger ? 'bg-we-danger/20 text-we-danger' : 'bg-we-panel text-we-muted',
      )}
    >
      {label}
    </span>
  )
}
