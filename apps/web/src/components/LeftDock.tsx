import { Fragment, useState } from 'react'
import { Layers, Search, Bookmark, Info, Plane, Ship, TrainFront, Truck, TriangleAlert, ShieldAlert, Globe, CloudSun, Satellite, Newspaper, Share2, ScanSearch, BellRing, Sparkles, BarChart3, FileText, Shield, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { openPanel, setActivePanel, setMenuOpen } from '../store/uiSlice'
import type { PanelId } from '../types'
import { cx } from '../lib/cx'
import { useSwipeToClose } from '../hooks/useSwipeToClose'

type Item = { id: Exclude<PanelId, null>; label: string; icon: LucideIcon }

const SEARCH: Item = { id: 'search', label: 'Search', icon: Search }

// Search lives in the top bar (and on "/"), so the rail stays short enough to fit.
const GROUPS: { label: string; items: Item[] }[] = [
  {
    label: 'Map',
    items: [
      { id: 'layers', label: 'Layers', icon: Layers },
      { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
      { id: 'info', label: 'Overview', icon: Info },
    ],
  },
  {
    label: 'Tracking',
    items: [
      { id: 'aircraft', label: 'Aircraft', icon: Plane },
      { id: 'ships', label: 'Ships', icon: Ship },
      { id: 'trains', label: 'Trains', icon: TrainFront },
      { id: 'fleet', label: 'Fleet', icon: Truck },
      { id: 'traffic', label: 'Traffic', icon: TriangleAlert },
    ],
  },
  {
    label: 'Environment',
    items: [
      { id: 'weather', label: 'Weather', icon: CloudSun },
      { id: 'satellites', label: 'Satellites', icon: Satellite },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { id: 'cyber', label: 'Cyber', icon: ShieldAlert },
      { id: 'domain', label: 'Domain', icon: Globe },
      { id: 'osint', label: 'OSINT', icon: ScanSearch },
      { id: 'news', label: 'News', icon: Newspaper },
      { id: 'social', label: 'Social', icon: Share2 },
    ],
  },
  {
    label: 'Operations',
    items: [
      { id: 'alerts', label: 'Alerts', icon: BellRing },
      { id: 'ai', label: 'AI', icon: Sparkles },
      { id: 'analytics', label: 'Analytics', icon: BarChart3 },
      { id: 'reports', label: 'Reports', icon: FileText },
      { id: 'admin', label: 'Admin', icon: Shield },
    ],
  },
]

export default function LeftDock() {
  const dispatch = useAppDispatch()
  const active = useAppSelector((s) => s.ui.activePanel)
  // Tooltip is fixed-positioned so the scrollable rail can't clip it; mouse only.
  const [tip, setTip] = useState<{ label: string; y: number } | null>(null)

  return (
    <>
      <nav
        aria-label="Panels"
        className="pointer-events-auto absolute bottom-[30px] left-0 top-14 z-30 hidden w-[60px] flex-col border-r border-we-border bg-white/90 backdrop-blur-xl md:flex"
      >
        <div
          className="no-scrollbar flex min-h-0 flex-1 flex-col items-center gap-0.5 overflow-y-auto py-2 [mask-image:linear-gradient(to_bottom,transparent,black_8px,black_calc(100%-8px),transparent)]"
          onScroll={() => setTip(null)}
        >
          {GROUPS.map((group, gi) => (
            <Fragment key={group.label}>
              {gi > 0 && <div className="my-1 h-px w-6 shrink-0 bg-we-border" />}
              {group.items.map(({ id, label, icon: Icon }) => {
                const isActive = active === id
                return (
                  <button
                    key={id}
                    onClick={() => dispatch(setActivePanel(id))}
                    onPointerEnter={(e) => {
                      if (e.pointerType !== 'mouse') return
                      const r = e.currentTarget.getBoundingClientRect()
                      setTip({ label, y: r.top + r.height / 2 })
                    }}
                    onPointerLeave={() => setTip(null)}
                    aria-label={label}
                    aria-pressed={isActive}
                    className={cx(
                      'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors',
                      isActive
                        ? 'bg-we-accent/10 text-we-accent'
                        : 'text-slate-500 hover:bg-we-panel-2 hover:text-we-text',
                    )}
                  >
                    {isActive && (
                      <span className="absolute -left-3 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-we-accent" />
                    )}
                    <Icon size={18} strokeWidth={1.8} />
                  </button>
                )
              })}
            </Fragment>
          ))}
        </div>
      </nav>
      {tip && (
        <div
          className="pointer-events-none fixed left-[66px] z-50 -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1 text-[12px] font-medium text-white shadow-lg"
          style={{ top: tip.y }}
        >
          {tip.label}
        </div>
      )}
    </>
  )
}

/** Phone-only replacement for the rail: every panel as a labelled tile in a bottom sheet. */
export function PanelLauncher() {
  const dispatch = useAppDispatch()
  const open = useAppSelector((s) => s.ui.menuOpen)
  const active = useAppSelector((s) => s.ui.activePanel)
  const { grab, sheetStyle } = useSwipeToClose(() => dispatch(setMenuOpen(false)))
  if (!open) return null

  const groups = GROUPS.map((g, i) => (i === 0 ? { ...g, items: [g.items[0], SEARCH, ...g.items.slice(1)] } : g))

  return (
    <div className="fixed inset-0 z-[60] md:hidden">
      <button
        aria-label="Close panel menu"
        className="absolute inset-0 bg-slate-900/25"
        onClick={() => dispatch(setMenuOpen(false))}
      />
      <div
        style={sheetStyle}
        className="absolute inset-x-0 bottom-0 flex max-h-[85dvh] animate-fade-in flex-col rounded-t-2xl bg-white shadow-[0_-12px_32px_-12px_rgba(15,23,42,0.3)] transition-transform duration-200 ease-out"
      >
        <div {...grab} className="shrink-0 select-none px-4 pt-2">
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-slate-300" />
          <div className="mb-1 flex items-center justify-between">
            <div className="text-[15px] font-semibold text-we-text">Panels</div>
            <button
              onClick={() => dispatch(setMenuOpen(false))}
              className="rounded-lg p-2 text-slate-400 hover:bg-we-panel-2 hover:text-we-text"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="min-h-0 overflow-y-auto overscroll-contain px-4 pb-6">
          {groups.map((group) => (
            <section key={group.label} className="mt-3">
              <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-we-muted">
                {group.label}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {group.items.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => dispatch(openPanel(id))}
                    className={cx(
                      'flex flex-col items-center gap-1.5 rounded-xl border px-1 py-2.5 text-[11.5px] font-medium transition-colors',
                      active === id
                        ? 'border-we-accent/40 bg-we-accent/10 text-we-accent'
                        : 'border-we-border text-slate-600 active:bg-we-panel-2',
                    )}
                  >
                    <Icon size={19} strokeWidth={1.8} />
                    <span className="max-w-full truncate">{label}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
