export type Ratio = { w: number; h: number }

export const presets: Ratio[] = [
  { w: 2, h: 2 },
  { w: 4, h: 5 },
  { w: 9, h: 16 },
]

export const defaultMattingColor = '#ebe2cc'
export const exportType = 'image/png'
export const exportExtension = 'png'

// Minimum matting on every side, as a fraction of the image's longer side.
export const defaultPadding = 0.06
export const maxPadding = 0.5

// The backdrop is blurred at this size and scaled up; the radius is a fraction of its longer side.
const backdropSize = 128
const backdropBlur = 0.08

// `scale` shrinks the whole render (for a quick live preview); 1 is full resolution.
export function drawMatted(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  ratio: Ratio,
  background: string | HTMLCanvasElement,
  padding: number,
  scale = 1,
) {
  const margin = Math.round(Math.max(image.width, image.height) * padding)
  let width = image.width + margin * 2
  let height = image.height + margin * 2
  const target = ratio.w / ratio.h
  if (width / height < target) width = Math.round(height * target)
  else height = Math.round(width / target)

  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  if (typeof background === 'string') {
    ctx.fillStyle = background
    ctx.fillRect(0, 0, width, height)
  } else {
    // Cover the frame, cropping the overflow evenly.
    const cover = Math.max(width / background.width, height / background.height)
    const [w, h] = [background.width * cover, background.height * cover]
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(background, (width - w) / 2, (height - h) / 2, w, h)
  }
  ctx.drawImage(image, Math.round((width - image.width) / 2), Math.round((height - image.height) / 2))
}

// Picks the dominant color along the image's edges: the edge pixels are grouped into
// coarse color buckets and the average of the most populated bucket wins.
export function borderColor(image: HTMLImageElement): string {
  const scale = Math.min(1, 100 / Math.max(image.width, image.height))
  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(image, 0, 0, width, height)
  const { data } = ctx.getImageData(0, 0, width, height)

  const band = 2
  const buckets = new Map<number, { count: number; r: number; g: number; b: number }>()
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x >= band && x < width - band && y >= band && y < height - band) continue
      const i = (y * width + x) * 4
      if (data[i + 3] < 128) continue
      const [r, g, b] = [data[i], data[i + 1], data[i + 2]]
      const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
      const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 }
      bucket.count++
      bucket.r += r
      bucket.g += g
      bucket.b += b
      buckets.set(key, bucket)
    }
  }

  let best: { count: number; r: number; g: number; b: number } | undefined
  for (const bucket of buckets.values()) if (!best || bucket.count > best.count) best = bucket
  if (!best) return defaultMattingColor
  const hex = (v: number) => Math.round(v / best.count).toString(16).padStart(2, '0')
  return `#${hex(best.r)}${hex(best.g)}${hex(best.b)}`
}

// A heavily blurred copy of the image; `fill` shows through its transparent areas. Blurs in JS
// because Safari doesn't support `ctx.filter`; three box blurs approximate a gaussian.
export function blurredBackdrop(image: HTMLImageElement, fill: string): HTMLCanvasElement {
  const scale = Math.min(1, backdropSize / Math.max(image.width, image.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.width * scale))
  canvas.height = Math.max(1, Math.round(image.height * scale))
  const { width, height } = canvas
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.fillStyle = fill
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(image, 0, 0, width, height)

  const pixels = ctx.getImageData(0, 0, width, height)
  const radius = Math.max(1, Math.round(Math.max(width, height) * backdropBlur))
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < height; y++) boxBlurLine(pixels.data, y * width, 1, width, radius)
    for (let x = 0; x < width; x++) boxBlurLine(pixels.data, x, width, height, radius)
  }
  ctx.putImageData(pixels, 0, 0)
  return canvas
}

// Blurs one row or column of RGB in place, repeating the edge pixels past its ends.
function boxBlurLine(data: Uint8ClampedArray, start: number, step: number, length: number, radius: number) {
  for (let channel = 0; channel < 3; channel++) {
    const at = (i: number) => (start + i * step) * 4 + channel
    const line = Array.from({ length }, (_, i) => data[at(i)])
    for (let i = 0; i < length; i++) {
      let sum = 0
      for (let j = i - radius; j <= i + radius; j++) sum += line[Math.min(length - 1, Math.max(0, j))]
      data[at(i)] = sum / (radius * 2 + 1)
    }
  }
}

export function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Export failed'))), exportType),
  )
}
