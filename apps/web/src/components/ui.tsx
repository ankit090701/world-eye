import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { cx } from '../lib/cx'

export function Switch({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cx(
        'relative h-5 w-9 shrink-0 rounded-full transition-colors',
        checked ? 'bg-we-accent/80' : 'bg-we-border-2',
      )}
    >
      <span
        className={cx(
          'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0.5',
        )}
      />
    </button>
  )
}

export function PanelShell({
  title,
  subtitle,
  icon,
  onClose,
  children,
}: {
  title: string
  subtitle?: string
  icon?: ReactNode
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="we-glass flex h-full w-[320px] flex-col rounded-xl shadow-panel">
      <div className="flex items-center gap-2 border-b border-we-border px-4 py-3">
        <span className="text-we-accent">{icon}</span>
        <div className="flex-1">
          <div className="text-sm font-semibold text-we-text">{title}</div>
          {subtitle && <div className="text-[11px] text-we-muted">{subtitle}</div>}
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-we-muted hover:bg-we-panel-2 hover:text-we-text"
          title="Close panel"
        >
          <X size={16} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">{children}</div>
    </div>
  )
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="mb-2 mt-1 text-[10px] font-semibold uppercase tracking-wider text-we-muted">
      {children}
    </div>
  )
}
