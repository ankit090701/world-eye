import { Globe2, Search, Sun, Moon } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { setActivePanel, setTheme } from '../store/uiSlice'
import { setBasemap } from '../store/mapSlice'
import { jumpToNow } from '../store/timelineSlice'
import { cx } from '../lib/cx'

export default function TopBar() {
  const dispatch = useAppDispatch()
  const theme = useAppSelector((s) => s.ui.theme)
  const mode = useAppSelector((s) => s.timeline.mode)
  const currentTime = useAppSelector((s) => s.timeline.currentTime)

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    dispatch(setTheme(next))
    dispatch(setBasemap(next === 'dark' ? 'dark' : 'light'))
  }

  return (
    <header className="pointer-events-auto absolute inset-x-0 top-0 z-40 flex h-14 items-center gap-3 border-b border-we-border bg-we-bg/85 px-3 backdrop-blur">
      {/* brand */}
      <div className="flex items-center gap-2.5">
        <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-we-accent/15 ring-1 ring-we-accent/40">
          <Globe2 size={20} className="text-we-accent" />
          <span className="absolute inset-0 rounded-lg ring-1 ring-we-accent/30 animate-pulse-ring" />
        </div>
        <div className="leading-tight">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-tight text-we-text">WorldEye</span>
            <span className="rounded bg-we-panel-2 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-we-accent">
              Module 1
            </span>
          </div>
          <div className="text-[11px] text-we-muted">World Map Dashboard</div>
        </div>
      </div>

      {/* search trigger */}
      <button
        onClick={() => dispatch(setActivePanel('search'))}
        className="ml-2 hidden min-w-0 flex-1 items-center gap-2 rounded-lg border border-we-border bg-we-panel-2/50 px-3 py-2 text-left text-xs text-we-muted hover:border-we-border-2 hover:text-we-text sm:flex md:max-w-md"
      >
        <Search size={14} />
        <span className="truncate">Search coordinates or places…</span>
      </button>

      <div className="flex-1 sm:hidden" />

      {/* live / replay status */}
      <button
        onClick={() => dispatch(jumpToNow())}
        title={mode === 'live' ? 'Live feed active' : 'Click to return to live'}
        className={cx(
          'flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium',
          mode === 'live'
            ? 'border-we-good/40 bg-we-good/10 text-we-good'
            : 'border-we-warn/40 bg-we-warn/10 text-we-warn',
        )}
      >
        <span className="relative flex h-2 w-2">
          {mode === 'live' && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-we-good opacity-75" />
          )}
          <span
            className={cx(
              'relative inline-flex h-2 w-2 rounded-full',
              mode === 'live' ? 'bg-we-good' : 'bg-we-warn',
            )}
          />
        </span>
        {mode === 'live' ? 'LIVE' : 'REPLAY'}
        <span className="hidden font-mono text-we-muted md:inline">
          {new Date(currentTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </button>

      <button
        onClick={toggleTheme}
        title="Toggle map theme (dark / light)"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-we-border bg-we-panel-2/50 text-we-muted hover:text-we-text"
      >
        {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
      </button>
    </header>
  )
}
