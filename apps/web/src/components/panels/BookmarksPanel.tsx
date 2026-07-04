import { useState } from 'react'
import { Bookmark as BookmarkIcon, Plus, Trash2, Pencil, Check, Navigation } from 'lucide-react'
import { PanelShell } from '../ui'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { setActivePanel, setToast } from '../../store/uiSlice'
import { useMapContext } from '../../map/MapContext'
import { addBookmark, removeBookmark, renameBookmark } from '../../store/bookmarksSlice'
import { setBasemap } from '../../store/mapSlice'
import { BASEMAPS } from '../../config/basemaps'
import type { Bookmark } from '../../types'
import { formatLngLat } from '../../lib/geo'

function makeId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `bm-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
  }
}

export default function BookmarksPanel() {
  const dispatch = useAppDispatch()
  const { map } = useMapContext()
  const items = useAppSelector((s) => s.bookmarks.items)
  const basemap = useAppSelector((s) => s.map.basemap)
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null)

  const addCurrent = () => {
    if (!map) return
    const c = map.getCenter()
    const bm: Bookmark = {
      id: makeId(),
      name: `View ${items.length + 1}`,
      lng: c.lng,
      lat: c.lat,
      zoom: map.getZoom(),
      pitch: map.getPitch(),
      bearing: map.getBearing(),
      basemap,
      createdAt: Date.now(),
    }
    dispatch(addBookmark(bm))
    setEditing({ id: bm.id, value: bm.name })
  }

  const goTo = (b: Bookmark) => {
    if (!map) return
    if (b.basemap !== basemap) dispatch(setBasemap(b.basemap))
    map.flyTo({
      center: [b.lng, b.lat],
      zoom: b.zoom,
      pitch: b.pitch,
      bearing: b.bearing,
      speed: 1.4,
    })
    dispatch(setToast(`Flew to “${b.name}”`))
  }

  const saveName = () => {
    if (editing) {
      dispatch(renameBookmark({ id: editing.id, name: editing.value.trim() || 'Untitled' }))
      setEditing(null)
    }
  }

  return (
    <PanelShell
      title="Bookmarks"
      subtitle="Saved map views"
      icon={<BookmarkIcon size={16} />}
      onClose={() => dispatch(setActivePanel(null))}
    >
      <button
        onClick={addCurrent}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-we-accent/50 bg-we-accent/10 px-3 py-2 text-xs font-medium text-we-text hover:shadow-glow"
      >
        <Plus size={14} className="text-we-accent" /> Bookmark current view
      </button>

      {items.length === 0 ? (
        <p className="mt-6 text-center text-[11px] text-we-muted">
          No bookmarks yet. Position the map and save a view — it persists in this browser.
        </p>
      ) : (
        <div className="mt-3 space-y-1.5">
          {items.map((b) => (
            <div
              key={b.id}
              className="group rounded-lg border border-we-border bg-we-panel-2/40 px-2.5 py-2 hover:border-we-border-2"
            >
              <div className="flex items-center gap-2">
                {editing?.id === b.id ? (
                  <input
                    autoFocus
                    value={editing.value}
                    onChange={(e) => setEditing({ id: b.id, value: e.target.value })}
                    onBlur={saveName}
                    onKeyDown={(e) => e.key === 'Enter' && saveName()}
                    className="flex-1 rounded border border-we-accent/50 bg-we-bg/60 px-1.5 py-0.5 text-xs text-we-text focus:outline-none"
                  />
                ) : (
                  <button
                    onClick={() => goTo(b)}
                    className="flex flex-1 items-center gap-1.5 text-left"
                    title="Fly to this view"
                  >
                    <Navigation size={12} className="text-we-accent" />
                    <span className="truncate text-xs font-medium text-we-text">{b.name}</span>
                  </button>
                )}
                <button
                  onClick={() =>
                    editing?.id === b.id ? saveName() : setEditing({ id: b.id, value: b.name })
                  }
                  className="rounded p-1 text-we-muted opacity-0 hover:text-we-text group-hover:opacity-100"
                  title="Rename"
                >
                  {editing?.id === b.id ? <Check size={13} /> : <Pencil size={12} />}
                </button>
                <button
                  onClick={() => dispatch(removeBookmark(b.id))}
                  className="rounded p-1 text-we-muted opacity-0 hover:text-we-danger group-hover:opacity-100"
                  title="Delete"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <div className="mt-1 flex items-center gap-2 pl-5">
                <span className="font-mono text-[10px] text-we-muted">
                  {formatLngLat(b.lng, b.lat, 3)} · z{b.zoom.toFixed(1)}
                </span>
                <span className="rounded bg-we-bg/60 px-1.5 py-0.5 text-[9px] text-we-muted">
                  {BASEMAPS[b.basemap].label}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </PanelShell>
  )
}
