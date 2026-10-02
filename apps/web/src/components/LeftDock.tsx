import { Fragment, useState } from 'react'
import { Layers, Bookmark, Info, Plane, Ship, TrainFront, Truck, TriangleAlert, ShieldAlert, Globe, CloudSun, Satellite, Newspaper, Share2, ScanSearch, BellRing, Sparkles, BarChart3, FileText, Shield } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { setActivePanel } from '../store/uiSlice'
import type { PanelId } from '../types'
import { cx } from '../lib/cx'

type Item = { id: Exclude<PanelId, null>; label: string; icon: LucideIcon }

// Search lives in the top bar (and on "/"), so the rail stays short enough to fit.
const GROUPS: Item[][] = [
  [
    { id: 'layers', label: 'Layers', icon: Layers },
    { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
    { id: 'info', label: 'Overview', icon: Info },
  ],
  [
    { id: 'aircraft', label: 'Aircraft', icon: Plane },
    { id: 'ships', label: 'Ships', icon: Ship },
    { id: 'trains', label: 'Trains', icon: TrainFront },
    { id: 'fleet', label: 'Fleet', icon: Truck },
    { id: 'traffic', label: 'Traffic', icon: TriangleAlert },
  ],
  [
    { id: 'weather', label: 'Weather', icon: CloudSun },
    { id: 'satellites', label: 'Satellites', icon: Satellite },
  ],
  [
    { id: 'cyber', label: 'Cyber', icon: ShieldAlert },
    { id: 'domain', label: 'Domain', icon: Globe },
    { id: 'osint', label: 'OSINT', icon: ScanSearch },
    { id: 'news', label: 'News', icon: Newspaper },
    { id: 'social', label: 'Social', icon: Share2 },
  ],
  [
    { id: 'alerts', label: 'Alerts', icon: BellRing },
    { id: 'ai', label: 'AI', icon: Sparkles },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'admin', label: 'Admin', icon: Shield },
  ],
]

export default function LeftDock() {
  const dispatch = useAppDispatch()
  const active = useAppSelector((s) => s.ui.activePanel)
  // Tooltip is fixed-positioned so the scrollable rail can't clip it.
  const [tip, setTip] = useState<{ label: string; y: number } | null>(null)

  return (
    <>
      <nav
        aria-label="Panels"
        className="pointer-events-auto absolute bottom-[30px] left-0 top-14 z-30 flex w-[60px] flex-col border-r border-we-border bg-white/90 backdrop-blur-xl"
      >
        <div
          className="no-scrollbar flex min-h-0 flex-1 flex-col items-center gap-0.5 overflow-y-auto py-2 [mask-image:linear-gradient(to_bottom,transparent,black_8px,black_calc(100%-8px),transparent)]"
          onScroll={() => setTip(null)}
        >
          {GROUPS.map((group, gi) => (
            <Fragment key={gi}>
              {gi > 0 && <div className="my-1 h-px w-6 shrink-0 bg-we-border" />}
              {group.map(({ id, label, icon: Icon }) => {
                const isActive = active === id
                return (
                  <button
                    key={id}
                    onClick={() => dispatch(setActivePanel(id))}
                    onMouseEnter={(e) => {
                      const r = e.currentTarget.getBoundingClientRect()
                      setTip({ label, y: r.top + r.height / 2 })
                    }}
                    onMouseLeave={() => setTip(null)}
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
