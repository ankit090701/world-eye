import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { setToast } from '../store/uiSlice'

export default function Toast() {
  const dispatch = useAppDispatch()
  const toast = useAppSelector((s) => s.ui.toast)

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => dispatch(setToast(null)), 2600)
    return () => window.clearTimeout(id)
  }, [toast, dispatch])

  if (!toast) return null
  return (
    <div className="pointer-events-none absolute left-1/2 top-16 z-50 -translate-x-1/2 animate-fade-in">
      <div className="we-glass rounded-full px-4 py-2 text-xs font-medium text-we-text shadow-panel">
        {toast}
      </div>
    </div>
  )
}
