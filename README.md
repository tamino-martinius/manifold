# manifold

An **atlas of computed mathematics** — interactive math illustrations, statically hosted on
GitHub Pages and built with TypeScript + Vite. Computational-terminal styling (Manifold design
system): monospace-forward, dark/light with a phosphor accent.

Live: **[manifold.tamino.dev](https://manifold.tamino.dev)**

## Illustrations

| Preview | Illustration | Description |
| :-----: | ------------ | ----------- |
| <a href="https://manifold.tamino.dev/chessboard/"><img src="docs/previews/chessboard.png" alt="Chessboard Patterns" width="240"></a> | **[Chessboard Patterns](https://manifold.tamino.dev/chessboard/)** | Pieces drop onto a counter-clockwise number spiral, each taking the lowest-indexed cell no opposing piece attacks. Accelerating, smoothly-zooming fill (cell&nbsp;1 stays centered); scrub the timeline, and configure pieces — colour, movement grid (29 symmetric presets), weight — and round-robin / weighted placement. Scales to **1,000,000** pieces, computed in a Web Worker with a progress bar so the UI never freezes. |
| <a href="https://manifold.tamino.dev/recaman/"><img src="docs/previews/recaman.png" alt="Recamán's Sequence" width="240"></a> | **[Recamán's Sequence](https://manifold.tamino.dev/recaman/)** | Alternating up/down semicircular arcs along a number line trace Recamán's sequence ([OEIS&nbsp;A005132](https://oeis.org/A005132)) into its iconic non-crossing web. Scrub the timeline to reveal arcs one at a time while a bounding-box camera keeps the growing line framed; play/pause/step and a speed control drive the reveal. Toggle **gradient-by-n** vs **single-accent** colouring and alternating vs all-above sides, and dial **terms** up to **100,000**. |

## Theme

Dark and light are both first-class and **auto-selected from the OS** (`prefers-color-scheme`),
with a manual toggle (persisted) in the header.

## Development

```bash
npm install
npm run dev        # start the dev server
npm test           # run unit tests (Vitest)
npm run lint       # Biome lint + format + import-order check
npm run typecheck  # tsc --noEmit
npm run build      # production build to dist/
```

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which lints, typechecks, tests, builds,
and deploys `dist/` to GitHub Pages. The custom domain is configured via `public/CNAME`
(`manifold.tamino.dev`).

**One-time setup:** in the repo's **Settings → Pages**, set **Source** to **GitHub Actions**, and
point the `manifold.tamino.dev` DNS record at GitHub Pages.

## Adding an illustration

1. Create `src/illustrations/<name>/` with a `main.ts` and a `preview.ts`.
2. Add `<name>/index.html` at the repo root and register it as an input in `vite.config.ts`.
3. Add an entry to `src/gallery/registry.ts`.
4. Drop a preview image in `docs/previews/<name>.png` and add a row to the Illustrations table above.

The Manifold design tokens live in `src/styles/manifold/` — link `styles.css` and use the CSS
custom properties (`--accent`, `--surface`, `--font-mono`, the `.ds-label`/`.ds-grid-bg`/`.ds-dot-bg`
utilities, etc.) so new pages inherit the theme automatically.
