// Navigation-arrow glyph (points up / heading) as ImageData for map.addImage.
const SIZE = 34

const HALF: [number, number][] = [
  [0, -15], // tip
  [9, 11], // right base
  [0, 5], // tail notch
]

export function createVehicleImage(): ImageData {
  const c = document.createElement('canvas')
  c.width = SIZE
  c.height = SIZE
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('2d context unavailable')

  ctx.clearRect(0, 0, SIZE, SIZE)
  ctx.translate(SIZE / 2, SIZE / 2)
  ctx.beginPath()
  ctx.moveTo(HALF[0][0], HALF[0][1])
  for (let i = 1; i < HALF.length; i++) ctx.lineTo(HALF[i][0], HALF[i][1])
  for (let i = HALF.length - 1; i >= 0; i--) ctx.lineTo(-HALF[i][0], HALF[i][1])
  ctx.closePath()

  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = 'rgba(7,11,18,0.92)'
  ctx.lineWidth = 2.2
  ctx.lineJoin = 'round'
  ctx.fill()
  ctx.stroke()

  return ctx.getImageData(0, 0, SIZE, SIZE)
}
