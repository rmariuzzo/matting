# Matting

A simple client-side app that takes an image and adds matting around it so the result fits a chosen aspect ratio.

## Flow

1. **Empty state:** a single large dashed drop zone fills the screen. Click it to pick an image or drag one in.
2. **Preview:** once an image is loaded, the matted result is shown in the center, with a toolbar on top and actions at the bottom.

## Top bar: presets

- Aspect ratio presets: **2×2**, **2×4**, **9×16**. 2×2 is selected by default.
- **Rotate** button: flips the preset dimensions (e.g. 9×16 → 16×9). It does not rotate the image.

## Matting

- The image is centered and never scaled or cropped.
- Every side gets at least 6% of the image's longer side as matting; the canvas then grows on one axis to reach the selected ratio.
- Matting color: detected from the image's edges each time an image is loaded, and changeable from the bottom bar.
  - The outer edge pixels (on a ~100px downscaled copy) are grouped into coarse color buckets; the average of the most common bucket wins, so a dominant edge color beats a muddy overall average.
  - Transparent edge pixels are ignored. If no usable pixels remain, it falls back to Sand light (`#EBE2CC`) from the [color scheme](color-scheme.md).

## Bottom bar: actions

- **Download:** saves the result as JPEG (quality 0.92), named `<original>-matted.jpg`.
- **Color:** a small round swatch between Download and Share, filled with the current matting color. Clicking it opens the system color picker; the preview updates live.
- **Drag out:** the preview image can be dragged out of the browser (to the desktop, a chat or an email) to drop the matted JPEG, named like the download.
- **Share:** opens the system share sheet via the Web Share API. Hidden when the browser can't share files.

## Other

- Clicking the preview, or dropping a new image anywhere, replaces the image.
- Everything runs in the browser; images never leave the device.
- No settings persist between sessions.
