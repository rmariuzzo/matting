# Matting

A simple client-side app that takes an image and adds matting around it so the result fits a chosen aspect ratio.

## Flow

1. **Empty state:** a single large dashed drop zone fills the screen. Click it to pick an image, drag one in, or paste one from the clipboard.
2. **Preview:** once an image is loaded, the matted result is shown in the center, with a toolbar on top and actions at the bottom.

## Top bar: presets

- Aspect ratio presets: **2×2**, **4×5** (WhatsApp chat messages), **9×16** (WhatsApp Status, Reels, Stories). 2×2 is selected by default.
- **Rotate** button: flips the preset dimensions (e.g. 9×16 → 16×9). It does not rotate the image.
- **Paste** button (last): loads the first image from the clipboard via the Async Clipboard API, replacing the current one. Also shown full width above the drop zone in the empty state. Hidden when the browser can't read the clipboard. This is the paste path on mobile, where paste events don't fire outside text fields.

## Matting

- The image is centered and never scaled or cropped.
- Every side gets at least the **padding** (default 6% of the image's longer side) as matting; the canvas then grows on one axis to reach the selected ratio.
- Padding is adjustable from 0% to 50%, like zooming the image inside the frame (smaller image = more matting):
  - **Desktop:** scroll over the preview (scroll down adds matting); a trackpad pinch works too. `+` / `-` keys step it by 1%.
  - **Mobile:** pinch the preview; the image's share of the frame follows the finger spread. A pinch never opens the file picker.
  - A "Padding N%" pill shows over the preview while adjusting, then fades.
  - It is kept when a new image is loaded.
- While settings change, a downscaled preview is drawn straight to the screen; the JPEG is encoded once changes settle.
- Blurred image: instead of a color, the matting can be a heavily blurred copy of the image, covering the whole frame (the overflow is cropped evenly). The sharp image stays on top, and the choice is kept when a new image is loaded.
  - Blurred in JS on a ~128px copy and scaled up, since Safari doesn't support canvas filters. Transparent areas show the detected color.
- Matting color: detected from the image's edges each time an image is loaded, and changeable from the bottom bar.
  - The outer edge pixels (on a ~100px downscaled copy) are grouped into coarse color buckets; the average of the most common bucket wins, so a dominant edge color beats a muddy overall average.
  - Transparent edge pixels are ignored. If no usable pixels remain, it falls back to Sand light (`#EBE2CC`) from the [color scheme](color-scheme.md).

## Bottom bar: actions

- **Download:** saves the result as JPEG (quality 0.92), named `<original>-matted.jpg`.
- **Color:** a small round swatch between Download and Share, filled with the current matting color. Clicking it opens the system color picker; the preview updates live. While the blurred image is selected, the first click only switches back to color matting, and the next one opens the picker.
- **Blurred image:** a matching round swatch next to Color, showing the blurred image. Clicking it switches to blurred matting. The selected swatch has the darker ring.
- **Drag out:** the preview image can be dragged out of the browser (to the desktop, a chat or an email) to drop the matted JPEG, named like the download.
- **Share:** opens the system share sheet via the Web Share API. Hidden when the browser can't share files.

## Other

- Clicking the preview, dropping a new image anywhere, or pasting one replaces the image.
- Pasting (⌘V / Ctrl+V) uses the first image on the clipboard; non-image pastes are ignored.
- Everything runs in the browser; images never leave the device.
- No settings persist between sessions.
