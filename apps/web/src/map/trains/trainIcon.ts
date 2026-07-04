// Top-down railcar glyph (front up, blockier than the ship icon) as ImageData
// for map.addImage; rotated by the derived heading.

const SIZE = 38

const HALF: [number, number][] = [
  [0, -15], // front centre
  [5.5, -10], // front corner
  [6, -5],
  [6, 13], // rear corner
  [0, 15], // rear centre
]

export function createTrainImage(): ImageData {
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

  // front "cab" mark so heading reads
  ctx.beginPath()
  ctx.moveTo(-4, -6)
  ctx.lineTo(4, -6)
  ctx.strokeStyle = 'rgba(7,11,18,0.55)'
  ctx.lineWidth = 1.5
  ctx.stroke()

  return ctx.getImageData(0, 0, SIZE, SIZE)
}
