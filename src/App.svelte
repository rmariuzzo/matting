<script lang="ts">
  import type { Attachment } from 'svelte/attachments'
  import Icon from './Icon.svelte'
  import {
    borderColor,
    defaultMattingColor,
    defaultPadding,
    drawMatted,
    exportExtension,
    exportType,
    maxPadding,
    presets,
    toBlob,
  } from './lib'

  let image = $state<HTMLImageElement>()
  let fileName = $state('')
  let presetIndex = $state(0)
  let rotated = $state(false)
  let color = $state(defaultMattingColor)
  let padding = $state(defaultPadding)
  let adjusting = $state(false)
  let adjustTimer: ReturnType<typeof setTimeout>
  let dragging = $state(false)
  let error = $state('')
  let internalDrag = false
  let output = $state<{ blob: Blob; url: string }>()
  // Whether `output` matches the current settings; until it does, the live canvas is shown.
  let fresh = $state(false)
  let liveCanvas = $state<HTMLCanvasElement>()
  const canvas = document.createElement('canvas')

  const ratio = $derived.by(() => {
    const p = presets[presetIndex]
    return rotated ? { w: p.h, h: p.w } : p
  })

  const outputName = $derived(`${fileName.replace(/\.[^.]+$/, '') || 'image'}-matted.${exportExtension}`)

  const canShare =
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [new File([], 'test.jpg', { type: exportType })] })

  // Render offscreen and encode once settings settle; the preview, download, share and
  // drag-out all use the same encoded file.
  $effect(() => {
    if (!image) return
    const [img, r, c, p] = [image, ratio, color, padding]
    fresh = false
    // Encoding mid-gesture is wasted work; the live canvas covers it.
    if (adjusting) return
    let cancelled = false
    const timer = setTimeout(async () => {
      drawMatted(canvas, img, r, c, p)
      const blob = await toBlob(canvas)
      if (cancelled) return
      if (output) URL.revokeObjectURL(output.url)
      output = { blob, url: URL.createObjectURL(blob) }
      fresh = true
    }, 120)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  })

  // A downscaled render drawn straight to the screen, so gestures and color changes feel instant.
  $effect(() => {
    if (!image || !liveCanvas || fresh) return
    const scale = Math.min(1, 2048 / Math.max(image.width, image.height))
    drawMatted(liveCanvas, image, ratio, color, padding, scale)
  })

  function setPadding(value: number) {
    padding = Math.min(maxPadding, Math.max(0, value))
    adjusting = true
    clearTimeout(adjustTimer)
    adjustTimer = setTimeout(() => (adjusting = false), 400)
  }

  // Scroll or pinch on the stage resizes the matting, like zooming the image inside the frame.
  const gestures: Attachment<HTMLElement> = (stage) => {
    function onWheel(e: WheelEvent) {
      if (!image) return
      e.preventDefault()
      // Trackpad pinches arrive as ctrl+wheel with small deltas; Firefox may report lines.
      const delta = e.deltaY * (e.deltaMode === 1 ? 16 : 1)
      setPadding(padding + delta * (e.ctrlKey ? 0.004 : 0.0005))
    }

    const touches = new Map<number, { x: number; y: number }>()
    let pinch: { spread: number; fraction: number } | undefined
    let pinched = false
    const spread = () => {
      const [a, b] = [...touches.values()]
      return Math.hypot(a.x - b.x, a.y - b.y) || 1
    }

    function onPointerDown(e: PointerEvent) {
      if (e.pointerType !== 'touch' || !image) return
      if (touches.size === 0) pinched = false
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (touches.size === 2) {
        // The image's share of the frame scales with the finger spread.
        pinch = { spread: spread(), fraction: 1 / (1 + 2 * padding) }
        pinched = true
      }
    }
    function onPointerMove(e: PointerEvent) {
      if (!touches.has(e.pointerId)) return
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pinch && touches.size === 2) setPadding((pinch.spread / (pinch.fraction * spread()) - 1) / 2)
    }
    function onPointerUp(e: PointerEvent) {
      touches.delete(e.pointerId)
      if (touches.size < 2) pinch = undefined
    }
    // A pinch must not count as a tap that opens the file picker.
    function onClick(e: MouseEvent) {
      if (pinched) e.preventDefault()
    }

    stage.addEventListener('wheel', onWheel, { passive: false })
    stage.addEventListener('pointerdown', onPointerDown)
    stage.addEventListener('pointermove', onPointerMove)
    stage.addEventListener('pointerup', onPointerUp)
    stage.addEventListener('pointercancel', onPointerUp)
    stage.addEventListener('click', onClick)
    return () => {
      stage.removeEventListener('wheel', onWheel)
      stage.removeEventListener('pointerdown', onPointerDown)
      stage.removeEventListener('pointermove', onPointerMove)
      stage.removeEventListener('pointerup', onPointerUp)
      stage.removeEventListener('pointercancel', onPointerUp)
      stage.removeEventListener('click', onClick)
    }
  }

  function loadFile(file: File | undefined) {
    error = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      error = 'That file is not an image.'
      return
    }
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      if (image) URL.revokeObjectURL(image.src)
      image = img
      fileName = file.name
      color = borderColor(img)
    }
    img.onerror = () => {
      error = 'Could not read that image.'
      URL.revokeObjectURL(url)
    }
    img.src = url
  }

  function download() {
    if (!output) return
    const a = document.createElement('a')
    a.href = output.url
    a.download = outputName
    a.click()
  }

  function onPreviewDragStart(e: DragEvent) {
    if (!output || !e.dataTransfer) return
    internalDrag = true
    e.dataTransfer.effectAllowed = 'copy'
    // Chromium uses this to drop a named file onto the desktop or into other apps.
    e.dataTransfer.setData('DownloadURL', `${exportType}:${outputName}:${output.url}`)
  }

  // Mobile browsers never fire paste events outside editable fields, so a button reads the
  // clipboard directly (each browser shows its own confirmation).
  const canPaste = typeof navigator.clipboard?.read === 'function'

  async function paste() {
    error = ''
    try {
      for (const item of await navigator.clipboard.read()) {
        const type = item.types.find((t) => t.startsWith('image/'))
        if (!type) continue
        const blob = await item.getType(type)
        loadFile(new File([blob], `image.${type.split('/')[1]}`, { type }))
        return
      }
      error = 'No image on the clipboard.'
    } catch (e) {
      if ((e as Error).name !== 'NotAllowedError') error = 'Could not read the clipboard.'
    }
  }

  async function share() {
    if (!output) return
    const file = new File([output.blob], outputName, { type: exportType })
    try {
      await navigator.share({ files: [file] })
    } catch (e) {
      if ((e as Error).name !== 'AbortError') error = 'Sharing failed.'
    }
  }
</script>

<svelte:window
  ondragover={(e) => {
    e.preventDefault()
    if (!internalDrag) dragging = true
  }}
  ondragleave={(e) => {
    if (!e.relatedTarget) dragging = false
  }}
  ondrop={(e) => {
    e.preventDefault()
    dragging = false
    if (!internalDrag) loadFile(e.dataTransfer?.files[0])
  }}
  onkeydown={(e) => {
    if (!image || e.metaKey || e.ctrlKey || e.altKey) return
    if (e.key === '+' || e.key === '=') setPadding(padding + 0.01)
    else if (e.key === '-') setPadding(padding - 0.01)
  }}
  onpaste={(e) => {
    const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'))
    if (!file) return
    e.preventDefault()
    loadFile(file)
  }}
/>

<div class="app" class:empty={!image} class:pasteable={canPaste}>
  {#if !image && canPaste}
    <div class="bar">
      <button onclick={paste}><Icon name="paste" /> Paste</button>
    </div>
  {/if}

  {#if image}
    <nav class="bar">
      {#each presets as preset, i}
        <button class:active={i === presetIndex} onclick={() => (presetIndex = i)}>
          {rotated ? `${preset.h}×${preset.w}` : `${preset.w}×${preset.h}`}
        </button>
      {/each}
      <button onclick={() => (rotated = !rotated)} aria-label="Rotate" title="Rotate">
        <Icon name="rotate" />
      </button>
      {#if canPaste}
        <button onclick={paste} aria-label="Paste" title="Paste">
          <Icon name="paste" />
        </button>
      {/if}
    </nav>
  {/if}

  <label
    class="stage"
    class:dragging
    title={image ? 'Scroll or pinch to resize the matting · drag out to share · click, drop or paste to replace' : undefined}
    {@attach gestures}
  >
    <input type="file" accept="image/*" onchange={(e) => loadFile(e.currentTarget.files?.[0])} />
    {#if image}
      {#if output && fresh}
        <img
          src={output.url}
          alt="Matted preview"
          ondragstart={onPreviewDragStart}
          ondragend={() => (internalDrag = false)}
        />
      {/if}
      <canvas bind:this={liveCanvas} hidden={fresh}></canvas>
      <span class="hint" class:visible={adjusting}>Padding {Math.round(padding * 100)}%</span>
    {:else}
      <span class="prompt">Click, drag or paste an image</span>
    {/if}
  </label>

  {#if error}<p class="error">{error}</p>{/if}

  {#if image}
    <div class="bar">
      <button class="primary" onclick={download}><Icon name="download" /> Download</button>
      <label class="swatch" style:background={color} title="Matting color">
        <input type="color" bind:value={color} aria-label="Matting color" />
      </label>
      {#if canShare}
        <button class="primary" onclick={share}><Icon name="share" /> Share</button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .app {
    height: 100dvh;
    display: grid;
    grid-template-rows: auto 1fr auto auto;
    gap: 1rem;
    padding: 1rem;
  }

  .app.empty {
    grid-template-rows: 1fr auto;
  }

  .app.empty.pasteable {
    grid-template-rows: auto 1fr auto;
  }

  .bar {
    display: flex;
    gap: 0.75rem;
  }

  .bar button {
    flex: 1;
    padding: 0.9rem 0.5rem;
    border: 1px solid var(--color-stone-dark);
    border-radius: 10px;
    background: var(--color-sand-light);
    color: inherit;
    font: inherit;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .bar button.active {
    background: var(--color-ink);
    border-color: var(--color-ink);
    color: var(--color-sand-light);
  }

  .swatch {
    position: relative;
    flex: none;
    align-self: center;
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 50%;
    border: 3px solid var(--color-ink);
    box-shadow: inset 0 0 0 2px var(--color-sand-light);
    cursor: pointer;
  }

  .swatch input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
  }

  .bar button.primary {
    background: var(--color-ink);
    border-color: var(--color-ink);
    color: var(--color-sand-light);
  }

  .stage {
    min-height: 0;
    display: grid;
    grid-template: minmax(0, 1fr) / minmax(0, 1fr);
    place-items: center;
    cursor: pointer;
    border-radius: 24px;
  }

  .stage > * {
    grid-area: 1 / 1;
  }

  .app:not(.empty) .stage {
    touch-action: none;
  }

  .empty .stage {
    border: 4px dashed var(--color-stone-dark);
  }

  .stage.dragging {
    outline: 4px dashed var(--color-ink);
    outline-offset: -4px;
  }

  .stage input {
    display: none;
  }

  .prompt {
    font-size: 1.25rem;
    opacity: 0.7;
    text-align: center;
  }

  img,
  canvas {
    max-width: 100%;
    max-height: 100%;
    box-shadow: 0 4px 24px rgb(0 0 0 / 0.18);
  }

  canvas[hidden] {
    display: none;
  }

  .hint {
    align-self: end;
    margin-bottom: 1rem;
    padding: 0.4rem 0.9rem;
    border-radius: 999px;
    background: var(--color-ink);
    color: var(--color-sand-light);
    font-weight: 600;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s;
  }

  .hint.visible {
    opacity: 1;
  }

  .error {
    margin: 0;
    text-align: center;
    color: #8a2d1f;
  }
</style>
