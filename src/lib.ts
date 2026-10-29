export type Ratio = { w: number; h: number }

export const presets: Ratio[] = [
  { w: 2, h: 2 },
  { w: 2, h: 4 },
  { w: 9, h: 16 },
]

export const defaultMattingColor = '#ebe2cc'
export const exportType = 'image/jpeg'
export const exportExtension = 'jpg'

// Minimum matting on every side, as a fraction of the image's longer side.
export const defaultPadding = 0.06
export const maxPadding = 0.5

// `scale` shrinks the whole render (for a quick live preview); 1 is full resolution.
export function drawMatted(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  ratio: Ratio,
  color: string,
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
  ctx.fillStyle = color
  ctx.fillRect(0, 0, width, height)
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

export function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Export failed'))), exportType, 0.92),
  )
}
