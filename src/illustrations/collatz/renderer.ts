import type { Camera } from "./camera";
import type { CollatzGeometry } from "./collatz";
import type { ColorMode } from "./state";

// Depth-gradient stops, sampled trunk(root)->tip so the layered structure reads.
// Two theme-tuned ramps of saturated, mid-luminance hues — crucially NOT running
// to near-black or near-white at either end, so neither the trunk nor the faint
// tips dissolve into the (dark or light) surface. Coral-like: green -> pink.
type Stop = readonly [number, number, number];
const DARK_STOPS: readonly Stop[] = [
  [0x3d, 0xdc, 0x84], // phosphor green (trunk)
  [0x22, 0xd3, 0xee], // cyan
  [0x9d, 0x8c, 0xff], // violet
  [0xff, 0x2e, 0x97], // pink (deep tips)
];
const LIGHT_STOPS: readonly Stop[] = [
  [0x0c, 0x7a, 0x42], // deep green (trunk)
  [0x0e, 0x74, 0x90], // teal
  [0x6d, 0x28, 0xd9], // violet
  [0xbe, 0x18, 0x5d], // rose (deep tips)
];

// Multiplicity is mapped to opacity + width through this many buckets so edges can
// be batched (one stroke per bucket) instead of one stroke per edge.
const WEIGHT_BUCKETS = 18;
// Faint tips must not vanish on the light surface — clamp the floor of the alpha.
const MIN_ALPHA = 0.05;
const CULL_MARGIN = 48; // px slack so partially-visible edges aren't dropped

export type RenderOpts = {
  frame: number; // reveal position (child depth threshold)
  opacity: number; // base stroke alpha
  colorMode: ColorMode;
  accent: string; // CSS color for solid mode (theme-driven)
  dark: boolean; // selects the depth ramp tuned for the current theme
  canvasW: number;
  canvasH: number;
};

function sampleRamp(stops: readonly Stop[], t: number): string {
  const clamped = t < 0 ? 0 : t > 1 ? 1 : t;
  const span = clamped * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(span));
  const f = span - i;
  const a = stops[i];
  const b = stops[i + 1];
  const r = Math.round(a[0] + (b[0] - a[0]) * f);
  const g = Math.round(a[1] + (b[1] - a[1]) * f);
  const bl = Math.round(a[2] + (b[2] - a[2]) * f);
  return `rgb(${r}, ${g}, ${bl})`;
}

/**
 * Draw the coral: each tree edge once, revealed by child depth, culled to the
 * viewport, and batched into (depth × weight) buckets so high-traffic trunk edges
 * read brighter/thicker and lonely tips faint/thin.
 */
export function renderCoral(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  geom: CollatzGeometry,
  opts: RenderOpts,
): void {
  ctx.clearRect(0, 0, opts.canvasW, opts.canvasH);
  if (geom.edgeCount <= 0) return;

  const { x0s, y0s, x1s, y1s, depths, weights, maxWeight, maxDepth } = geom;
  const revealMax = Math.floor(opts.frame);
  const logMax = maxWeight > 1 ? Math.log(maxWeight) : 1;
  const depthMode = opts.colorMode === "depth-gradient";
  const stops = opts.dark ? DARK_STOPS : LIGHT_STOPS;
  const dpr = window.devicePixelRatio || 1;

  const minS = -CULL_MARGIN;
  const maxXs = opts.canvasW + CULL_MARGIN;
  const maxYs = opts.canvasH + CULL_MARGIN;

  // Bucket key -> accumulated path. Key folds depth (color) and weight together.
  const paths = new Map<number, Path2D>();
  for (let e = 0; e < geom.edgeCount; e++) {
    if (depths[e] > revealMax) continue;

    const sx0 = x0s[e] * cam.scale + cam.offsetX;
    const sy0 = -y0s[e] * cam.scale + cam.offsetY;
    const sx1 = x1s[e] * cam.scale + cam.offsetX;
    const sy1 = -y1s[e] * cam.scale + cam.offsetY;
    if (sx0 < minS && sx1 < minS) continue;
    if (sx0 > maxXs && sx1 > maxXs) continue;
    if (sy0 < minS && sy1 < minS) continue;
    if (sy0 > maxYs && sy1 > maxYs) continue;

    const wn = maxWeight > 1 ? Math.log(weights[e]) / logMax : 1;
    const wBucket = Math.round((wn < 0 ? 0 : wn > 1 ? 1 : wn) * (WEIGHT_BUCKETS - 1));
    const key = depthMode ? depths[e] * WEIGHT_BUCKETS + wBucket : wBucket;

    let path = paths.get(key);
    if (!path) {
      path = new Path2D();
      paths.set(key, path);
    }
    path.moveTo(sx0, sy0);
    path.lineTo(sx1, sy1);
  }

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const denom = WEIGHT_BUCKETS - 1;
  for (const [key, path] of paths) {
    const wBucket = depthMode ? key % WEIGHT_BUCKETS : key;
    const wn = wBucket / denom;
    const alpha = Math.min(1, Math.max(MIN_ALPHA, opts.opacity * (0.32 + 0.68 * wn)));
    ctx.globalAlpha = alpha;
    ctx.lineWidth = dpr * (0.5 + 2.3 * wn);
    if (depthMode) {
      const d = Math.floor(key / WEIGHT_BUCKETS);
      ctx.strokeStyle = sampleRamp(stops, maxDepth > 0 ? d / maxDepth : 0);
    } else {
      ctx.strokeStyle = opts.accent;
    }
    ctx.stroke(path);
  }
  ctx.globalAlpha = 1;
}
