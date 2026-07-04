// Top-down vessel silhouette (pointed bow up, flat stern) as ImageData for
// map.addImage; rotated by course/heading on the map.

const SIZE = 40

const HALF: [number, number][] = [
  [0, -17], // bow tip
  [6, -3], // shoulder
  [6, 14], // stern quarter
  [0, 15], // stern centre
]

export function createShipImage(): ImageData {
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
