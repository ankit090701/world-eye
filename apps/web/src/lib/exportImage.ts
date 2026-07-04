import type { Map as MlMap } from 'maplibre-gl'

function timestamp(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(
    d.getMinutes(),
  )}${p(d.getSeconds())}`
}

/**
 * Export the current map view to a PNG and trigger a download.
 * Relies on the map being created with `preserveDrawingBuffer: true`.
 */
export function exportMapImage(map: MlMap) {
  const src = map.getCanvas()
  const w = src.width
  const h = src.height

  const out = document.createElement('canvas')
  out.width = w
  out.height = h
  const ctx = out.getContext('2d')
  if (!ctx) return

  // base map (data layers + drawings are part of the WebGL canvas)
  ctx.drawImage(src, 0, 0)

  // footer bar with branding + timestamp
  const scale = w / 1280
  const barH = Math.max(28, Math.round(34 * scale))
  ctx.fillStyle = 'rgba(7, 11, 18, 0.72)'
  ctx.fillRect(0, h - barH, w, barH)

  const fs = Math.max(11, Math.round(13 * scale))
  ctx.font = `600 ${fs}px system-ui, sans-serif`
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#22d3ee'
  ctx.fillText('WorldEye', Math.round(14 * scale), h - barH / 2)

  const label = `World Map Dashboard · ${new Date().toLocaleString()}`
  ctx.fillStyle = '#cbd5e1'
  const brandW = ctx.measureText('WorldEye').width
  ctx.font = `400 ${fs}px system-ui, sans-serif`
  ctx.fillText(label, Math.round(14 * scale) + brandW + Math.round(12 * scale), h - barH / 2)

  const attrib = '© OpenStreetMap · CARTO · Esri'
  ctx.textAlign = 'right'
  ctx.fillStyle = '#64748b'
  ctx.fillText(attrib, w - Math.round(14 * scale), h - barH / 2)
  ctx.textAlign = 'left'

  out.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `worldeye-${timestamp()}.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }, 'image/png')
}
