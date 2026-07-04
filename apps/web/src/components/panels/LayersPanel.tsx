import { Layers, Globe2, Map as MapIcon } from 'lucide-react'
import { PanelShell, SectionTitle, Switch } from '../ui'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { setActivePanel } from '../../store/uiSlice'
import { setBasemap, setProjection } from '../../store/mapSlice'
import { setLayerOpacity, toggleLayer } from '../../store/layersSlice'
import { BASEMAPS, BASEMAP_ORDER } from '../../config/basemaps'
import { cx } from '../../lib/cx'
import type { LayerState } from '../../types'

export default function LayersPanel() {
  const dispatch = useAppDispatch()
  const basemap = useAppSelector((s) => s.map.basemap)
  const projection = useAppSelector((s) => s.map.projection)
  const layers = useAppSelector((s) => s.layers.items)

  const overlays = layers.filter((l) => l.group === 'Overlays')
  const reference = layers.filter((l) => l.group === 'Reference')

  return (
    <PanelShell
      title="Layers"
      subtitle="Basemap, projection & overlays"
      icon={<Layers size={16} />}
      onClose={() => dispatch(setActivePanel(null))}
    >
      <SectionTitle>Basemap</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        {BASEMAP_ORDER.map((id) => {
          const b = BASEMAPS[id]
          const selected = basemap === id
          return (
            <button
              key={id}
              onClick={() => dispatch(setBasemap(id))}
              className={cx(
                'rounded-lg border px-2.5 py-2 text-left text-xs transition-colors',
                selected
                  ? 'border-we-accent/70 bg-we-accent/10 text-we-text shadow-glow'
                  : 'border-we-border bg-we-panel-2/50 text-we-muted hover:border-we-border-2 hover:text-we-text',
              )}
            >
              <div className="flex items-center gap-1.5">
                <MapIcon size={13} className={selected ? 'text-we-accent' : ''} />
                <span className="font-medium">{b.label}</span>
              </div>
            </button>
          )
        })}
      </div>

      <SectionTitle>Projection</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        {(['globe', 'mercator'] as const).map((p) => (
          <button
            key={p}
            onClick={() => dispatch(setProjection(p))}
            className={cx(
              'flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs capitalize transition-colors',
              projection === p
                ? 'border-we-accent/70 bg-we-accent/10 text-we-text shadow-glow'
                : 'border-we-border bg-we-panel-2/50 text-we-muted hover:text-we-text',
            )}
          >
            <Globe2 size={13} />
            {p === 'globe' ? '3D Globe' : 'Flat (2D)'}
          </button>
        ))}
      </div>

      <div className="mt-4" />
      <SectionTitle>Overlays</SectionTitle>
      <div className="space-y-2">
        {overlays.map((l) => (
          <LayerRow key={l.id} layer={l} />
        ))}
      </div>

      <div className="mt-4" />
      <SectionTitle>Reference</SectionTitle>
      <div className="space-y-2">
        {reference.map((l) => (
          <LayerRow key={l.id} layer={l} />
        ))}
      </div>
    </PanelShell>
  )
}

function LayerRow({ layer }: { layer: LayerState }) {
  const dispatch = useAppDispatch()
  return (
    <div className="rounded-lg border border-we-border bg-we-panel-2/40 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ background: layer.color }}
        />
        <div className="flex-1">
          <div className="text-xs font-medium text-we-text">{layer.name}</div>
          {layer.description && (
            <div className="text-[10px] leading-tight text-we-muted">{layer.description}</div>
          )}
        </div>
        <Switch
          checked={layer.visible}
          onChange={() => dispatch(toggleLayer(layer.id))}
        />
      </div>
      <div className={cx('mt-2 flex items-center gap-2', !layer.visible && 'opacity-40')}>
        <span className="w-12 text-[10px] uppercase tracking-wide text-we-muted">Opacity</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={layer.opacity}
          disabled={!layer.visible}
          onChange={(e) =>
            dispatch(setLayerOpacity({ id: layer.id, opacity: Number(e.target.value) }))
          }
          className="flex-1"
        />
        <span className="w-8 text-right font-mono text-[10px] text-we-muted">
          {Math.round(layer.opacity * 100)}
        </span>
      </div>
    </div>
  )
}
