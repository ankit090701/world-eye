// Lightweight inline-SVG charts for Module 16 (Analytics). No dependency — themed
// to the WorldEye dark UI. All responsive via viewBox + width:100%.

export const CHART_PALETTE = ['#38bdf8', '#34d399', '#f59e0b', '#a78bfa', '#f43f5e', '#22d3ee', '#fb923c', '#c084fc']
const AXIS = 'rgba(148,163,184,0.5)'
const GRID = 'rgba(148,163,184,0.12)'

export interface Datum {
  label: string
  value: number
  color?: string
}

export function BarChart({ data, height = 96, unit = '' }: { data: Datum[]; height?: number; unit?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  const n = data.length
  const gap = 6
  const bw = n ? (300 - gap * (n + 1)) / n : 0
  return (
    <svg viewBox={`0 0 300 ${height + 24}`} width="100%" style={{ display: 'block' }} role="img">
      <line x1="0" y1={height} x2="300" y2={height} stroke={AXIS} strokeWidth="1" />
      {data.map((d, i) => {
        const h = (d.value / max) * (height - 6)
        const x = gap + i * (bw + gap)
        return (
          <g key={i}>
            <rect x={x} y={height - h} width={bw} height={h} rx="2" fill={d.color ?? CHART_PALETTE[0]} opacity="0.9" />
            <text x={x + bw / 2} y={height - h - 3} textAnchor="middle" fontSize="8" fill="#e2e8f0">{d.value}</text>
            <text x={x + bw / 2} y={height + 11} textAnchor="middle" fontSize="7.5" fill="#94a3b8">{d.label}</text>
          </g>
        )
      })}
      {unit && <text x="300" y="10" textAnchor="end" fontSize="7.5" fill="#64748b">{unit}</text>}
    </svg>
  )
}

export function HBarChart({ data, unit = '' }: { data: Datum[]; unit?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  const rowH = 18
  const h = data.length * rowH + 4
  return (
    <svg viewBox={`0 0 300 ${h}`} width="100%" style={{ display: 'block' }} role="img">
      {data.map((d, i) => {
        const w = (d.value / max) * 190
        const y = i * rowH + 2
        return (
          <g key={i}>
            <text x="0" y={y + 11} fontSize="8.5" fill="#cbd5e1">{d.label.slice(0, 16)}</text>
            <rect x="92" y={y + 3} width={w} height={rowH - 8} rx="2" fill={d.color ?? CHART_PALETTE[0]} opacity="0.9" />
            <text x={92 + w + 4} y={y + 11} fontSize="8" fill="#94a3b8">{d.value}{unit}</text>
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
  let offset = 0
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      <svg viewBox="0 0 90 90" width="90" height="90" role="img">
        <circle cx="45" cy="45" r={R} fill="none" stroke={GRID} strokeWidth="12" />
        {sum > 0 &&
          data.map((d, i) => {
            const frac = d.value / sum
            const dash = frac * C
            const el = (
              <circle
                key={i}
                cx="45"
                cy="45"
                r={R}
                fill="none"
                stroke={d.color ?? CHART_PALETTE[i % CHART_PALETTE.length]}
                strokeWidth="12"
                strokeDasharray={`${dash} ${C - dash}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 45 45)"
              />
            )
            offset += dash
            return el
          })}
        <text x="45" y="43" textAnchor="middle" fontSize="15" fontWeight="600" fill="#e2e8f0">{sum}</text>
        {label && <text x="45" y="55" textAnchor="middle" fontSize="7" fill="#94a3b8">{label}</text>}
      </svg>
      <div style={{ flex: 1, minWidth: 0 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#cbd5e1', lineHeight: '15px' }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: d.color ?? CHART_PALETTE[i % CHART_PALETTE.length], display: 'inline-block', flexShrink: 0 }} />
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</span>
            <span style={{ color: '#94a3b8' }}>{d.value}</span>
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
  if (n < 2) return <div style={{ fontSize: 10, color: '#64748b', padding: '18px 0', textAlign: 'center' }}>collecting trend data…</div>
  const x = (i: number) => (i / (n - 1)) * W
  const y = (v: number) => height - ((v - min) / (max - min || 1)) * (height - 6) - 3
  const line = points.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const area = `${line} L${W},${height} L0,${height} Z`
  return (
    <svg viewBox={`0 0 ${W} ${height}`} width="100%" style={{ display: 'block' }} role="img">
      <line x1="0" y1={height - 1} x2={W} y2={height - 1} stroke={AXIS} strokeWidth="1" />
      <path d={area} fill={color} opacity="0.12" />
      <path d={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(n - 1)} cy={y(points[n - 1])} r="2.5" fill={color} />
    </svg>
  )
}
