<script lang="ts">
  import { borderColor, defaultMattingColor, drawMatted, exportExtension, exportType, presets, toBlob } from './lib'

  let image = $state<HTMLImageElement>()
  let fileName = $state('')
  let presetIndex = $state(0)
  let rotated = $state(false)
  let color = $state(defaultMattingColor)
  let dragging = $state(false)
  let error = $state('')
  let canvas = $state<HTMLCanvasElement>()

  const ratio = $derived.by(() => {
    const p = presets[presetIndex]
    return rotated ? { w: p.h, h: p.w } : p
  })

  const outputName = $derived(`${fileName.replace(/\.[^.]+$/, '') || 'image'}-matted.${exportExtension}`)

  const canShare =
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [new File([], 'test.jpg', { type: exportType })] })

  $effect(() => {
    if (image && canvas) drawMatted(canvas, image, ratio, color)
  })

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

  async function download() {
    if (!canvas) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(await toBlob(canvas))
    a.download = outputName
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function share() {
    if (!canvas) return
    const file = new File([await toBlob(canvas)], outputName, { type: exportType })
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
    dragging = true
  }}
  ondragleave={(e) => {
    if (!e.relatedTarget) dragging = false
  }}
  ondrop={(e) => {
    e.preventDefault()
    dragging = false
    loadFile(e.dataTransfer?.files[0])
  }}
/>

<div class="app" class:empty={!image}>
  {#if image}
    <nav class="bar">
      {#each presets as preset, i}
        <button class:active={i === presetIndex} onclick={() => (presetIndex = i)}>
          {rotated ? `${preset.h}×${preset.w}` : `${preset.w}×${preset.h}`}
        </button>
      {/each}
      <button onclick={() => (rotated = !rotated)} aria-label="Rotate" title="Rotate">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path
            d="M4 12a8 8 0 0 1 14-5.3M20 4v4h-4M20 12a8 8 0 0 1-14 5.3M4 20v-4h4"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </nav>
  {/if}

  <label class="stage" class:dragging title={image ? 'Click or drop to replace the image' : undefined}>
    <input type="file" accept="image/*" onchange={(e) => loadFile(e.currentTarget.files?.[0])} />
    {#if image}
      <canvas bind:this={canvas}></canvas>
    {:else}
      <span class="prompt">Click or drag an image</span>
    {/if}
  </label>

  {#if error}<p class="error">{error}</p>{/if}

  {#if image}
    <div class="bar">
      <button class="primary" onclick={download}>Download</button>
      <label class="swatch" style:background={color} title="Matting color">
        <input type="color" bind:value={color} aria-label="Matting color" />
      </label>
      {#if canShare}
        <button class="primary" onclick={share}>Share</button>
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
    display: grid;
    place-items: center;
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

  canvas {
    max-width: 100%;
    max-height: 100%;
    box-shadow: 0 4px 24px rgb(0 0 0 / 0.18);
  }

  .error {
    margin: 0;
    text-align: center;
    color: #8a2d1f;
  }
</style>
