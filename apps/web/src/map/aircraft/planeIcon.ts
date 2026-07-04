// Generates a top-down airplane silhouette (pointing north / up) as ImageData,
// so it can be added to the map with map.addImage and rotated by heading.
// White fill + dark outline reads on both dark and light basemaps.

const SIZE = 44

// right-half outline points (x>=0), nose at top; mirrored for the left half.
const HALF: [number, number][] = [
  [0, -20], // nose
  [2, -8], // forward fuselage
  [3, -3], // wing root (leading)
  [20, 6], // wing tip (leading)
  [20, 9], // wing tip (trailing)
  [3, 3], // wing root (trailing)
  [2.5, 12], // rear fuselage
  [9, 18], // tailplane tip (leading)
  [9, 20], // tailplane tip (trailing)
  [1.5, 15], // tail root
  [0, 16], // tail centre
]

export function createPlaneImage(): ImageData {
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
  ctx.lineWidth = 2.4
  ctx.lineJoin = 'round'
  ctx.fill()
  ctx.stroke()

  return ctx.getImageData(0, 0, SIZE, SIZE)
}
