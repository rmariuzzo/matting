<script lang="ts">
  import { icons, type IconName } from './icons'

  let { name }: { name: IconName } = $props()
</script>

<svg viewBox={icons[name].viewBox} aria-hidden="true">
  <path d={icons[name].d} fill="currentColor" />
</svg>

<style>
  svg {
    width: 1.25em;
    height: 1.25em;
  }
</style>
