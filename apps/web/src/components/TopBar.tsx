import { useEffect } from 'react'
import { LayoutGrid, Search } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { openPanel, setActivePanel, setMenuOpen } from '../store/uiSlice'
import { jumpToNow } from '../store/timelineSlice'
import { cx } from '../lib/cx'

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <defs>
        <linearGradient id="we-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="1" stopColor="#4338ca" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#we-logo)" />
      <g fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="16" cy="16" r="8.5" />
        <path d="M7.5 16h17M16 7.5c2.6 2.4 3.9 5.2 3.9 8.5s-1.3 6.1-3.9 8.5c-2.6-2.4-3.9-5.2-3.9-8.5s1.3-6.1 3.9-8.5z" />
      </g>
    </svg>
  )
}

function isTyping(el: EventTarget | null): boolean {
  const t = el as HTMLElement | null
  return !!t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))
}

export default function TopBar() {
  const dispatch = useAppDispatch()
  const mode = useAppSelector((s) => s.timeline.mode)
  const currentTime = useAppSelector((s) => s.timeline.currentTime)
  const menuOpen = useAppSelector((s) => s.ui.menuOpen)

  // "/" opens search from anywhere outside a text field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return
      e.preventDefault()
      dispatch(openPanel('search'))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dispatch])

  const live = mode === 'live'

  return (
    <header className="pointer-events-auto absolute inset-x-0 top-0 z-40 flex h-14 items-center gap-2 border-b border-we-border bg-white/85 px-3 backdrop-blur-xl sm:gap-4 sm:px-4">
      <div className="flex shrink-0 items-center gap-2.5">
        <LogoMark className="h-8 w-8 drop-shadow-sm" />
        <div className="leading-tight">
          <div className="text-[15px] font-semibold tracking-tight text-we-text">WorldEye</div>
          <div className="text-[11px] font-medium text-we-muted">Global intelligence</div>
        </div>
      </div>

      <button
        onClick={() => dispatch(setActivePanel('search'))}
        className="hidden h-9 min-w-0 flex-1 items-center gap-2.5 rounded-xl lg:ml-4 border border-we-border bg-we-panel-2 px-3 text-left text-[13px] text-we-muted transition-colors hover:border-we-border-2 hover:bg-white sm:flex md:max-w-[420px]"
      >
        <Search size={15} className="shrink-0" />
        <span className="truncate">Search places or coordinates</span>
        <kbd className="ml-auto hidden rounded-md border border-we-border bg-white px-1.5 font-mono text-[10px] leading-[18px] text-we-muted md:block">
          /
        </kbd>
      </button>

      <div className="flex-1" />

      <button
        onClick={() => dispatch(openPanel('search'))}
        aria-label="Search places or coordinates"
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-we-border bg-we-panel-2 text-slate-500 sm:hidden"
      >
        <Search size={16} />
      </button>

      <button
        onClick={() => dispatch(jumpToNow())}
        title={live ? 'Live feed active' : 'Click to return to live'}
        className={cx(
          'flex h-9 items-center gap-2 rounded-full border px-3.5 text-[12px] font-semibold transition-colors',
          live
            ? 'border-we-good/25 bg-we-good/10 text-we-good'
            : 'border-we-warn/30 bg-we-warn/10 text-we-warn hover:bg-we-warn/15',
        )}
      >
        <span className="relative flex h-2 w-2">
          {live && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-we-good opacity-60" />
          )}
          <span className={cx('relative inline-flex h-2 w-2 rounded-full', live ? 'bg-we-good' : 'bg-we-warn')} />
        </span>
        {live ? 'Live' : 'Replay'}
        <span className="hidden font-mono text-[11px] font-medium text-we-muted md:inline">
          {new Date(currentTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </button>

      <button
        onClick={() => dispatch(setMenuOpen(!menuOpen))}
        aria-label="Panels"
        aria-expanded={menuOpen}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-we-border bg-white text-slate-600 md:hidden"
      >
        <LayoutGrid size={17} />
      </button>
    </header>
  )
}
