# rmariuzzo-matting

Client-side Svelte 5 + TypeScript app built with Vite, deployed to GitHub Pages.

## Scripts

```sh
npm run dev      # start dev server
npm run check    # type-check (svelte-check + tsc)
npm run build    # production build to dist/
npm run preview  # serve dist/ locally
```

## Deploy

1. Push to a GitHub repo on the `main` branch.
2. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Every push to `main` runs `.github/workflows/deploy.yml`, which builds and publishes `dist/`.
