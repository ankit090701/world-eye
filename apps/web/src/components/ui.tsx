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
        'relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200',
        checked ? 'bg-we-accent' : 'bg-slate-200 hover:bg-slate-300',
      )}
    >
      <span
        className={cx(
          'absolute left-0 top-0.5 h-4 w-4 rounded-full bg-white shadow-[0_1px_3px_rgba(15,23,42,0.25)] transition-transform duration-200',
          checked ? 'translate-x-[18px]' : 'translate-x-0.5',
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
    <div className="flex h-full w-[340px] flex-col overflow-hidden rounded-2xl border border-we-border bg-white/95 shadow-panel backdrop-blur-xl">
      <div className="flex items-center gap-3 border-b border-we-border px-4 py-3">
        {icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-we-accent/10 text-we-accent">
            {icon}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-semibold tracking-tight text-we-text">{title}</div>
          {subtitle && <div className="truncate text-[11.5px] text-we-muted">{subtitle}</div>}
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-we-panel-2 hover:text-we-text"
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
    <div className="mb-2 mt-5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-we-muted first:mt-0">
      {children}
    </div>
  )
}
