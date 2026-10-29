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
const minMargin = 0.06

export function drawMatted(canvas: HTMLCanvasElement, image: HTMLImageElement, ratio: Ratio, color: string) {
  const margin = Math.round(Math.max(image.width, image.height) * minMargin)
  let width = image.width + margin * 2
  let height = image.height + margin * 2
  const target = ratio.w / ratio.h
  if (width / height < target) width = Math.round(height * target)
  else height = Math.round(width / target)

  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = color
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(image, Math.round((width - image.width) / 2), Math.round((height - image.height) / 2))
}

export function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Export failed'))), exportType, 0.92),
  )
}
