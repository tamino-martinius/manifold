# Math Illustrations

Interactive math illustrations, statically hosted on GitHub Pages and built with TypeScript + Vite.

## Illustrations

- **Chessboard Patterns** — pieces fill a counter-clockwise number-spiral board, each placed on
  the lowest-numbered cell not attacked by an enemy color. Configure pieces (color, movement grid)
  and placement order in the side panel.

## Development

```bash
npm install
npm run dev        # start the dev server
npm test           # run unit tests
npm run lint       # Biome lint + format check
npm run typecheck  # tsc --noEmit
npm run build      # production build to dist/
```

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which lints, typechecks, tests, builds,
and deploys `dist/` to GitHub Pages.

**One-time setup:** in the repo's **Settings → Pages**, set **Source** to **GitHub Actions**.

## Adding an illustration

1. Create `src/illustrations/<name>/` with a `main.ts` and a `preview.ts`.
2. Add `<name>/index.html` at the repo root and register it as an input in `vite.config.ts`.
3. Add an entry to `src/gallery/registry.ts`.
