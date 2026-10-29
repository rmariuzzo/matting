# rmariuzzo-matting

Client-side Svelte 5 + TypeScript app built with Vite, deployed to GitHub Pages.

## Scripts

The Node version is pinned in `.nvmrc`; run `nvm use` first. Dependencies are managed with pnpm (`pnpm install`).

```sh
pnpm dev         # start dev server
pnpm check       # type-check (svelte-check + tsc)
pnpm build       # production build to dist/
pnpm preview     # serve dist/ locally
```

## Deploy

1. Push to a GitHub repo on the `main` branch.
2. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Every push to `main` runs `.github/workflows/deploy.yml`, which builds and publishes `dist/`.
