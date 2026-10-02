import { ChevronRight, Layers } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { openPanel } from '../store/uiSlice'

/** Points first-time users at the Layers panel while the globe is bare (sits where the panel would open). */
export default function LayerHint() {
  const dispatch = useAppDispatch()
  const anyVisible = useAppSelector((s) => s.layers.items.some((l) => l.visible))
  const idle = useAppSelector((s) => s.ui.activePanel === null && !s.ui.menuOpen && s.ui.activeTool === 'none')
  if (anyVisible || !idle) return null

  return (
    <button
      onClick={() => dispatch(openPanel('layers'))}
      className="pointer-events-auto absolute left-3 top-[68px] z-20 flex animate-fade-in items-center gap-2.5 rounded-xl border border-we-border bg-white/90 py-2 pl-2 pr-3 text-left shadow-card backdrop-blur-xl transition-colors hover:bg-white md:left-[72px]"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-we-accent/10 text-we-accent">
        <Layers size={16} />
      </span>
      <span className="leading-tight">
        <span className="block text-[13px] font-semibold text-we-text">Choose what to show</span>
        <span className="block text-[11.5px] text-we-muted">Turn on layers to see live data</span>
      </span>
      <ChevronRight size={16} className="shrink-0 text-slate-400" />
    </button>
  )
}
