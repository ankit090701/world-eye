import { useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'

const PHONE = '(max-width: 767px)'
const SLIDE_MS = 200

/**
 * Drag-down-to-close for the phone bottom sheets. Spread `grab` on the handle/header and put `sheetStyle`
 * on the sheet (which should carry a transform transition). A long drag or a quick flick slides the sheet
 * away and calls `onClose`; anything shorter springs back. Inert above the phone breakpoint.
 */
export function useSwipeToClose(onClose: () => void) {
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)

  const onPointerDown = (e: ReactPointerEvent) => {
    if (!e.isPrimary || e.button !== 0 || !window.matchMedia(PHONE).matches) return
    if ((e.target as Element).closest('button')) return
    const startY = e.clientY
    let dy = 0
    let lastY = startY
    let lastT = e.timeStamp
    let velocity = 0 // px/ms, smoothed over the latest moves so a pause before the flick doesn't hide it
    setDragging(true)

    const move = (ev: PointerEvent) => {
      const dt = ev.timeStamp - lastT
      if (dt > 0) velocity = 0.7 * ((ev.clientY - lastY) / dt) + 0.3 * velocity
      lastY = ev.clientY
      lastT = ev.timeStamp
      dy = Math.max(0, ev.clientY - startY)
      setOffset(dy)
    }
    const end = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      setDragging(false)
      const flick = dy > 24 && velocity > 0.5 && ev.timeStamp - lastT < 100
      if (ev.type === 'pointerup' && (dy > 96 || flick)) {
        setOffset(window.innerHeight)
        window.setTimeout(() => {
          onClose()
          setOffset(0)
        }, SLIDE_MS)
      } else {
        setOffset(0)
      }
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
  }

  const sheetStyle: CSSProperties | undefined = offset
    ? { transform: `translateY(${offset}px)`, transition: dragging ? 'none' : undefined }
    : undefined

  return { grab: { onPointerDown, style: { touchAction: 'none' } as CSSProperties }, sheetStyle }
}
