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

export default function TimelineBar() {
  const dispatch = useAppDispatch()
  const { mode, rangeStart, rangeEnd, currentTime, windowMinutes, playing, speed } =
    useAppSelector((s) => s.timeline)

  const behind = rangeEnd - currentTime

  return (
    <div className="pointer-events-auto absolute bottom-9 left-1/2 z-20 w-[min(920px,calc(100%-7rem))] -translate-x-1/2">
      <div className="we-glass flex items-center gap-3 rounded-xl px-3 py-2 shadow-panel">
        {/* play / pause */}
        <button
          onClick={() => dispatch(togglePlaying())}
          title={playing ? 'Pause playback' : 'Play historical playback'}
          className={cx(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border',
            playing
              ? 'border-we-accent/70 bg-we-accent/15 text-we-accent'
              : 'border-we-border bg-we-panel-2/60 text-we-text hover:text-we-accent',
          )}
        >
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>

        {/* live */}
        <button
          onClick={() => dispatch(jumpToNow())}
          title="Jump to live"
          className={cx(
            'flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-medium',
            mode === 'live'
              ? 'border-we-good/50 bg-we-good/10 text-we-good'
              : 'border-we-border bg-we-panel-2/60 text-we-muted hover:text-we-text',
          )}
        >
          <Radio size={14} />
          LIVE
        </button>

        {/* scrubber */}
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <input
            type="range"
            min={rangeStart}
            max={rangeEnd}
            step={60000}
            value={currentTime}
            onChange={(e) => dispatch(setCurrentTime(Number(e.target.value)))}
            className="w-full"
          />
          <div className="mt-1 flex items-center justify-between text-[10px] text-we-muted">
            <span className="font-mono">
              {new Date(rangeStart).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
              <span className="ml-1 opacity-60">-24h</span>
            </span>
            <span className="flex items-center gap-1 font-mono text-we-accent">
              <Clock size={11} />
              {new Date(currentTime).toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
              <span className="text-we-muted">({relative(behind)})</span>
            </span>
            <span className="font-mono">
              now
              <span className="ml-1 opacity-60">
                {new Date(rangeEnd).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </span>
          </div>
        </div>

        {/* speed */}
        <div className="hidden shrink-0 items-center gap-1 lg:flex">
          <span className="text-[10px] uppercase text-we-muted">Speed</span>
          <div className="flex overflow-hidden rounded-lg border border-we-border">
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => dispatch(setSpeed(s))}
                className={cx(
                  'px-2 py-1 text-[10px] font-mono',
                  speed === s
                    ? 'bg-we-accent/20 text-we-accent'
                    : 'text-we-muted hover:bg-we-panel-2',
                )}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>

        {/* window */}
        <div className="hidden shrink-0 items-center gap-1 xl:flex">
          <span className="text-[10px] uppercase text-we-muted">Window</span>
          <div className="flex overflow-hidden rounded-lg border border-we-border">
            {WINDOWS.map((w) => (
              <button
                key={w.m}
                onClick={() => dispatch(setWindowMinutes(w.m))}
                className={cx(
                  'px-2 py-1 text-[10px] font-mono',
                  windowMinutes === w.m
                    ? 'bg-we-accent/20 text-we-accent'
                    : 'text-we-muted hover:bg-we-panel-2',
                )}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
