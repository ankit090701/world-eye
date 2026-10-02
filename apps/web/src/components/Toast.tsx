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
    <div className="pointer-events-none absolute left-1/2 top-[68px] z-50 -translate-x-1/2 animate-fade-in">
      <div className="rounded-full bg-slate-900/95 px-4 py-2 text-[12.5px] font-medium text-white shadow-lg">
        {toast}
      </div>
    </div>
  )
}
