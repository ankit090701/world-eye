// Lightweight inline-SVG charts for Module 16 (Analytics). No dependency — themed
// to the WorldEye light UI. All responsive via viewBox + width:100%.

/** Validated light-mode categorical palette (fixed order; CVD-checked on white). */
export const CHART_PALETTE = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948']

const INK = '#0f172a'
const INK_2 = '#475569'
const MUTED = '#64748b'
const GRID = '#e2e8f0'
const AXIS = '#cbd5e1'
const TRACK = '#eef1f5'

export interface Datum {
  label: string
  value: number
  color?: string
}

/** Bar with a rounded data-end and a square baseline (vertical: top rounded). */
function columnPath(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, w / 2, h)
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`
}

/** Horizontal bar: square at the left baseline, rounded right end. */
function rowPath(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, h / 2, w)
  return `M${x},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h - rr}Q${x + w},${y + h} ${x + w - rr},${y + h}H${x}Z`
}

export function BarChart({ data, height = 96, unit = '' }: { data: Datum[]; height?: number; unit?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  const n = data.length
  const slot = n ? 300 / n : 0
  const bw = Math.min(24, slot * 0.62)
  return (
    <svg viewBox={`0 0 300 ${height + 24}`} width="100%" style={{ display: 'block' }} role="img">
      <line x1="0" y1={height + 0.5} x2="300" y2={height + 0.5} stroke={AXIS} strokeWidth="1" />
      {data.map((d, i) => {
        const h = (d.value / max) * (height - 12)
        const x = i * slot + (slot - bw) / 2
        return (
          <g key={i}>
            <title>{`${d.label || '—'}: ${d.value}${unit ? ' ' + unit : ''}`}</title>
            {h > 0 && <path d={columnPath(x, height - h, bw, h, 4)} fill={d.color ?? CHART_PALETTE[0]} />}
            <text x={x + bw / 2} y={height - h - 4} textAnchor="middle" fontSize="8.5" fontWeight="600" fill={INK}>
              {d.value}
            </text>
            <text x={x + bw / 2} y={height + 13} textAnchor="middle" fontSize="8" fill={MUTED}>
              {d.label}
            </text>
          </g>
        )
      })}
      {unit && <text x="300" y="9" textAnchor="end" fontSize="8" fill={MUTED}>{unit}</text>}
    </svg>
  )
}

export function HBarChart({ data, unit = '' }: { data: Datum[]; unit?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  const rowH = 20
  const h = data.length * rowH + 4
  return (
    <svg viewBox={`0 0 300 ${h}`} width="100%" style={{ display: 'block' }} role="img">
      <line x1="92.5" y1="0" x2="92.5" y2={h} stroke={GRID} strokeWidth="1" />
      {data.map((d, i) => {
        const w = Math.max(2, (d.value / max) * 180)
        const y = i * rowH + 2
        return (
          <g key={i}>
            <title>{`${d.label}: ${d.value}${unit}`}</title>
            <text x="0" y={y + 12} fontSize="9" fill={INK_2}>{d.label.slice(0, 16)}</text>
            <path d={rowPath(93, y + 4, w, rowH - 9, 4)} fill={d.color ?? CHART_PALETTE[0]} />
            <text x={93 + w + 5} y={y + 12} fontSize="8.5" fontWeight="600" fill={INK}>{d.value}{unit}</text>
          </g>
        )
      })}
    </svg>
  )
}

export function Donut({ data, total, label }: { data: Datum[]; total?: number; label?: string }) {
  const sum = total ?? data.reduce((s, d) => s + d.value, 0)
  const R = 34
  const C = 2 * Math.PI * R
  const GAP = 2
  const parts = data.filter((d) => d.value > 0).length
  let offset = 0
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <svg viewBox="0 0 90 90" width="90" height="90" role="img">
        <circle cx="45" cy="45" r={R} fill="none" stroke={TRACK} strokeWidth="11" />
        {sum > 0 &&
          data.map((d, i) => {
            const len = (d.value / sum) * C
            const dash = parts > 1 ? Math.max(0, len - GAP) : len
            const el = (
              <circle
                key={i}
                cx="45"
                cy="45"
                r={R}
                fill="none"
                stroke={d.color ?? CHART_PALETTE[i % CHART_PALETTE.length]}
                strokeWidth="11"
                strokeDasharray={`${dash} ${C - dash}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 45 45)"
              >
                <title>{`${d.label}: ${d.value}`}</title>
              </circle>
            )
            offset += len
            return el
          })}
        <text x="45" y="45" textAnchor="middle" fontSize="15" fontWeight="700" fill={INK}>{sum}</text>
        {label && <text x="45" y="56" textAnchor="middle" fontSize="7" fill={MUTED}>{label}</text>}
      </svg>
      <div style={{ flex: 1, minWidth: 0 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: INK_2, lineHeight: '17px' }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: d.color ?? CHART_PALETTE[i % CHART_PALETTE.length], display: 'inline-block', flexShrink: 0 }} />
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</span>
            <span style={{ color: INK, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function LineChart({ points, height = 70, color = CHART_PALETTE[0] }: { points: number[]; height?: number; color?: string }) {
  const W = 300
  const max = Math.max(1, ...points)
  const min = Math.min(0, ...points)
  const n = points.length
  if (n < 2) return <div style={{ fontSize: 11, color: MUTED, padding: '18px 0', textAlign: 'center' }}>collecting trend data…</div>
  const x = (i: number) => 4 + (i / (n - 1)) * (W - 10)
  const y = (v: number) => height - ((v - min) / (max - min || 1)) * (height - 10) - 5
  const line = points.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const area = `${line} L${x(n - 1)},${height} L${x(0)},${height} Z`
  const last = points[n - 1]
  return (
    <svg viewBox={`0 0 ${W} ${height}`} width="100%" style={{ display: 'block' }} role="img">
      <title>{`Latest: ${last}`}</title>
      <line x1="0" y1={height - 0.5} x2={W} y2={height - 0.5} stroke={AXIS} strokeWidth="1" />
      <path d={area} fill={color} opacity="0.1" />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(n - 1)} cy={y(last)} r="4" fill={color} stroke="#ffffff" strokeWidth="2" />
    </svg>
  )
}
