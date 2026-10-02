import { Play, Pause, Radio, Clock } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import {
  jumpToNow,
  setCurrentTime,
  setSpeed,
  setWindowMinutes,
  togglePlaying,
} from '../store/timelineSlice'
import { cx } from '../lib/cx'

const SPEEDS = [60, 120, 300, 600]
const WINDOWS: { m: number; label: string }[] = [
  { m: 30, label: '30m' },
  { m: 60, label: '1h' },
  { m: 180, label: '3h' },
  { m: 360, label: '6h' },
  { m: 720, label: '12h' },
  { m: 1440, label: '24h' },
]

function relative(fromNow: number): string {
  if (fromNow < 60000) return 'now'
  const min = Math.floor(fromNow / 60000)
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? `-${h}h ${m}m` : `-${m}m`
}

function Segmented<T extends number>({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  className?: string
}) {
  return (
    <div className={cx('shrink-0 items-center gap-2', className)}>
      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-we-muted">{label}</span>
      <div className="flex rounded-lg bg-we-panel-2 p-0.5">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={cx(
              'rounded-md px-2 py-[3px] font-mono text-[10.5px] font-medium transition-colors',
              value === o.value
                ? 'bg-white text-we-text shadow-sm ring-1 ring-slate-900/5'
                : 'text-we-muted hover:text-we-text',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function TimelineBar() {
  const dispatch = useAppDispatch()
  const { mode, rangeStart, rangeEnd, currentTime, windowMinutes, playing, speed } =
    useAppSelector((s) => s.timeline)

  const behind = rangeEnd - currentTime
  const hhmm = (t: number) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="pointer-events-auto absolute inset-x-3 bottom-[40px] z-20 md:inset-x-auto md:bottom-[42px] md:left-[calc(50%+30px)] md:w-[min(1060px,calc(100%-160px))] md:-translate-x-1/2 lg:w-[min(1060px,calc(100%-420px))]">
      <div className="flex items-center gap-2 rounded-2xl border border-we-border bg-white/90 px-2 py-1.5 shadow-panel backdrop-blur-xl sm:gap-3 sm:px-3 sm:py-2">
        <button
          onClick={() => dispatch(togglePlaying())}
          title={playing ? 'Pause playback' : 'Play historical playback'}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-we-accent text-white shadow-glow transition-colors hover:bg-we-accent-2"
        >
          {playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" className="ml-0.5" />}
        </button>

        <button
          onClick={() => dispatch(jumpToNow())}
          title="Jump to live"
          className={cx(
            'flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[11.5px] font-semibold transition-colors',
            mode === 'live'
              ? 'border-we-good/25 bg-we-good/10 text-we-good'
              : 'border-we-border bg-white text-we-muted hover:text-we-text',
          )}
        >
          <Radio size={13} />
          Live
        </button>

        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <input
            type="range"
            min={rangeStart}
            max={rangeEnd}
            step={60000}
            value={currentTime}
            onChange={(e) => dispatch(setCurrentTime(Number(e.target.value)))}
            className="w-full"
            aria-label="Timeline position"
          />
          <div className="mt-1.5 flex items-center justify-center gap-3 whitespace-nowrap text-[10.5px] text-we-muted sm:justify-between">
            <span className="hidden font-mono tabular-nums sm:inline">
              {hhmm(rangeStart)}
              <span className="ml-1 opacity-70">−24h</span>
            </span>
            <span className="flex items-center gap-1 font-mono font-medium tabular-nums text-we-accent">
              <Clock size={11} />
              {new Date(currentTime).toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
              <span className="font-normal text-we-muted">({relative(behind)})</span>
            </span>
            <span className="hidden font-mono tabular-nums sm:inline">
              now <span className="opacity-70">{hhmm(rangeEnd)}</span>
            </span>
          </div>
        </div>

        <Segmented
          label="Speed"
          className="hidden lg:flex"
          options={SPEEDS.map((s) => ({ value: s, label: `${s}×` }))}
          value={speed}
          onChange={(s) => dispatch(setSpeed(s))}
        />
        <Segmented
          label="Window"
          className="hidden xl:flex"
          options={WINDOWS.map((w) => ({ value: w.m, label: w.label }))}
          value={windowMinutes}
          onChange={(m) => dispatch(setWindowMinutes(m))}
        />
      </div>
    </div>
  )
}
