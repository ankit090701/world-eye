// Wind arrow glyph (points "up" = 0°; the layer rotates it downwind) as ImageData.
const SIZE = 30

export function createWindArrowImage(): ImageData {
  const c = document.createElement('canvas')
  c.width = SIZE
  c.height = SIZE
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('2d context unavailable')

  ctx.clearRect(0, 0, SIZE, SIZE)
  ctx.translate(SIZE / 2, SIZE / 2)

  ctx.strokeStyle = '#e0f2fe'
  ctx.fillStyle = '#e0f2fe'
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  // shaft
  ctx.beginPath()
  ctx.moveTo(0, 10)
  ctx.lineTo(0, -8)
  ctx.stroke()

  // arrow head
  ctx.beginPath()
  ctx.moveTo(0, -12)
  ctx.lineTo(5, -4)
  ctx.lineTo(0, -6)
  ctx.lineTo(-5, -4)
  ctx.closePath()
  ctx.fill()

  return ctx.getImageData(0, 0, SIZE, SIZE)
}
