import { Layers, Search, Bookmark, Info, Plane, Ship, TrainFront, Truck, TriangleAlert, ShieldAlert, Globe, CloudSun, Satellite, Newspaper, Share2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { setActivePanel } from '../store/uiSlice'
import type { PanelId } from '../types'
import { cx } from '../lib/cx'

const ITEMS: { id: Exclude<PanelId, null>; label: string; icon: LucideIcon }[] = [
  { id: 'layers', label: 'Layers', icon: Layers },
  { id: 'aircraft', label: 'Aircraft', icon: Plane },
  { id: 'ships', label: 'Ships', icon: Ship },
  { id: 'trains', label: 'Trains', icon: TrainFront },
  { id: 'fleet', label: 'Fleet', icon: Truck },
  { id: 'traffic', label: 'Traffic', icon: TriangleAlert },
  { id: 'cyber', label: 'Cyber', icon: ShieldAlert },
  { id: 'domain', label: 'Domain', icon: Globe },
  { id: 'weather', label: 'Weather', icon: CloudSun },
  { id: 'satellites', label: 'Satellites', icon: Satellite },
  { id: 'news', label: 'News', icon: Newspaper },
  { id: 'social', label: 'Social', icon: Share2 },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
  { id: 'info', label: 'Overview', icon: Info },
]

export default function LeftDock() {
  const dispatch = useAppDispatch()
  const active = useAppSelector((s) => s.ui.activePanel)
  return (
    <div className="pointer-events-auto absolute left-3 top-16 z-30 flex flex-col gap-1.5">
      {ITEMS.map(({ id, label, icon: Icon }) => {
        const isActive = active === id
        return (
          <button
            key={id}
            onClick={() => dispatch(setActivePanel(id))}
            title={label}
            className={cx(
              'group relative flex h-10 w-10 items-center justify-center rounded-lg border transition-colors',
              isActive
                ? 'border-we-accent/70 bg-we-accent/15 text-we-accent shadow-glow'
                : 'we-glass border-we-border text-we-muted hover:text-we-text',
            )}
          >
            <Icon size={18} />
            <span className="pointer-events-none absolute left-12 hidden whitespace-nowrap rounded-md bg-we-panel px-2 py-1 text-[11px] text-we-text shadow-panel group-hover:block">
              {label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
