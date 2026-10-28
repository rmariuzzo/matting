import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Relative base so the build works under https://<user>.github.io/<repo>/
  base: './',
  plugins: [svelte()],
})
