import type { Camera } from "./camera";
import type { FordCircle } from "./farey";
import type { ColorMode, FillMode } from "./state";

const TAU = Math.PI * 2;

// On-screen culling / level-of-detail thresholds, in DEVICE pixels (the canvas is
// sized cssW·dpr, and the camera scale maps world → device px directly).
const MIN_R_PX = 0.3; // smaller than this on screen → skip (invisible)
// Label gates scale with dpr so labels only appear on genuinely large, readable
// circles and the text stays crisp on HiDPI.
const LABEL_MIN_R_CSS = 18; // css-px on-screen radius to start fading labels in
const LABEL_FULL_R_CSS = 34; // …fully opaque by here

const BUCKETS = 32; // quantized color buckets → one fill()/stroke() per bucket
const FILL_ALPHA = 0.26;

// Illustration gradient stops (Manifold --pal-ice / --pal-spectral, theme-agnostic).
const ICE: ReadonlyArray<readonly [number, number, number]> = [
  [3, 6, 14],
  [12, 58, 107],
  [34, 211, 238],
  [226, 250, 255],
];
// Color-by-depth maps each circle through this spectral ramp by its Stern–Brocot
// generation, stretched across the depth range currently present (recomputed every
// frame) — a smooth, consistent gradient from the lowest to the highest depth.
const SPECTRAL: ReadonlyArray<readonly [number, number, number]> = [
  [255, 0, 77],
  [255, 138, 0],
  [255, 230, 0],
  [61, 220, 132],
  [34, 211, 238],
  [106, 92, 255],
  [255, 46, 151],
];

function sampleRamp(
  stops: ReadonlyArray<readonly [number, number, number]>,
  t: number,
): [number, number, number] {
  const tt = t <= 0 ? 0 : t >= 1 ? 1 : t;
  const seg = tt * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(seg));
  const f = seg - i;
  const a = stops[i];
  const b = stops[i + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

function smoothstep(t: number): number {
  const x = t < 0 ? 0 : t > 1 ? 1 : t;
  return x * x * (3 - 2 * x);
}

// Theme-driven chrome colors, re-read only when the theme actually changes.
let themeKey = "";
let isLight = false;
let lineColor = "#2a343a";
let labelColor = "#9fabb2";
function readTheme(): void {
  const key = document.documentElement.dataset.theme ?? "";
  if (key === themeKey) return;
  themeKey = key;
  isLight = key === "light";
  const cs = getComputedStyle(document.documentElement);
  lineColor = cs.getPropertyValue("--line-strong").trim() || lineColor;
  labelColor = cs.getPropertyValue("--text-muted").trim() || labelColor;
}

function rgbStr(c: readonly [number, number, number]): string {
  return `rgb(${c[0] | 0}, ${c[1] | 0}, ${c[2] | 0})`;
}

/**
 * Render the number line and the Ford circles visible in the camera.
 *
 * Circles are drawn perfectly round (single shared scale), revealed up to order
 * `nEff` (q ≤ nEff), and culled both off-screen and below MIN_R_PX. Because
 * `circles` is sorted by ascending q, iteration stops early once q exceeds the
 * smaller of nEff and the cull-implied max q — so deep zoom stays cheap.
 */
export function renderFord(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  circles: FordCircle[],
  nEff: number,
  colorMode: ColorMode,
  fillMode: FillMode,
  w: number,
  h: number,
): void {
  readTheme();
  const dpr = window.devicePixelRatio || 1;
  ctx.clearRect(0, 0, w, h);

  const scale = cam.scale;
  const lineY = cam.offsetY; // world y = 0 maps here

  // ---- Number line + integer ticks/labels (quiet; the circles are the subject) ----
  if (lineY >= -2 && lineY <= h + 2) {
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = Math.max(1, dpr);
    ctx.beginPath();
    ctx.moveTo(0, lineY);
    ctx.lineTo(w, lineY);
    ctx.stroke();

    const xMinWorld = (0 - cam.offsetX) / scale;
    const xMaxWorld = (w - cam.offsetX) / scale;
    const first = Math.ceil(xMinWorld);
    const last = Math.floor(xMaxWorld);
    if (last >= first && last - first <= 200) {
      const tickLen = 6 * dpr;
      ctx.fillStyle = labelColor;
      ctx.font = `${Math.round(11 * dpr)}px "JetBrains Mono", ui-monospace, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.beginPath();
      for (let k = first; k <= last; k++) {
        const sx = k * scale + cam.offsetX;
        ctx.moveTo(sx, lineY);
        ctx.lineTo(sx, lineY + tickLen);
        ctx.fillText(String(k), sx, lineY + tickLen + 3 * dpr);
      }
      ctx.strokeStyle = lineColor;
      ctx.stroke();
    }
  }

  if (circles.length === 0) return;

  // ---- Reveal + cull bounds ----
  // r·scale ≥ MIN_R_PX  ⇔  scale/(2q²) ≥ MIN_R_PX  ⇔  q ≤ sqrt(scale/(2·MIN_R_PX)).
  const qCull = Math.sqrt(scale / (2 * MIN_R_PX));
  const qMax = Math.min(nEff, qCull);
  if (qMax < 1) return;

  // "By denominator": stable ice ramp normalized by max q (zoom/reveal-independent).
  const maxQ = Math.max(2, circles[circles.length - 1].q);
  const logMaxQ = Math.log(maxQ);
  const iceLo = isLight ? 0 : 0.42; // legible on both themes
  const iceHi = isLight ? 0.7 : 1;

  // ---- Group visible circles by color (one fill()/stroke() per group). ----
  // Depth → a spectral gradient; denominator → a quantized ice bucket.
  type Item = { x: number; y: number; r: number };
  const groups = new Map<number, Item[]>();
  const labelMinR = LABEL_MIN_R_CSS * dpr;
  const labelFullR = LABEL_FULL_R_CSS * dpr;
  const labels: { x: number; y: number; r: number; p: number; q: number }[] = [];

  // "By depth": stretch the spectral gradient across the depth range of the
  // PROMINENTLY visible circles, recomputed every frame. The endpoints track the
  // lowest/highest depth currently on screen, so the gradient stays full whether
  // you reveal more orders or zoom into deeper structure (and a fixed circle like
  // 1/2 drifts slightly in hue as that range changes). The prominence floor keeps
  // a few sub-pixel deep circles from collapsing the whole range to one end.
  const PROMINENT_PX = 3 * dpr;
  let minDepth = Number.POSITIVE_INFINITY;
  let maxDepth = -1;
  let minDepthAny = Number.POSITIVE_INFINITY;
  let maxDepthAny = 0;

  for (let i = 0; i < circles.length; i++) {
    const c = circles[i];
    if (c.q > qMax) break; // sorted by q → nothing further qualifies
    const sr = c.r * scale;
    if (sr < MIN_R_PX) continue;
    const sx = c.x * scale + cam.offsetX;
    if (sx + sr < 0 || sx - sr > w) continue; // off-screen in x
    const cy = lineY - sr; // center (circle is tangent to the line at its bottom)
    if (lineY < 0 || cy - sr > h) continue; // off-screen in y

    let key: number;
    if (colorMode === "depth") {
      key = c.depth;
      if (c.depth < minDepthAny) minDepthAny = c.depth;
      if (c.depth > maxDepthAny) maxDepthAny = c.depth;
      if (sr >= PROMINENT_PX) {
        if (c.depth < minDepth) minDepth = c.depth;
        if (c.depth > maxDepth) maxDepth = c.depth;
      }
    } else {
      const t = logMaxQ > 0 ? Math.log(c.q) / logMaxQ : 0;
      key = Math.min(BUCKETS - 1, Math.max(0, Math.floor(t * (BUCKETS - 1))));
    }
    let items = groups.get(key);
    if (!items) {
      items = [];
      groups.set(key, items);
    }
    items.push({ x: sx, y: cy, r: sr });

    if (sr > labelMinR) labels.push({ x: sx, y: cy, r: sr, p: c.p, q: c.q });
  }
  if (maxDepth < 0) {
    // Nothing met the prominence floor → fall back to all visible circles.
    minDepth = Number.isFinite(minDepthAny) ? minDepthAny : 0;
    maxDepth = maxDepthAny;
  }
  const depthRange = Math.max(1, maxDepth - minDepth);

  const colorFor = (key: number): string =>
    colorMode === "depth"
      ? rgbStr(sampleRamp(SPECTRAL, (key - minDepth) / depthRange))
      : rgbStr(sampleRamp(ICE, iceLo + (iceHi - iceLo) * (key / (BUCKETS - 1))));

  // ---- Draw groups (one path per color) ----
  const strokePx = (fillMode === "fill" ? 1.1 : 1.3) * dpr;
  for (const [key, items] of groups) {
    const color = colorFor(key);
    ctx.beginPath();
    for (const it of items) {
      ctx.moveTo(it.x + it.r, it.y); // avoid a connecting line into the arc
      ctx.arc(it.x, it.y, it.r, 0, TAU);
    }
    if (fillMode === "fill") {
      ctx.globalAlpha = FILL_ALPHA;
      ctx.fillStyle = color;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.lineWidth = strokePx;
    ctx.strokeStyle = color;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // ---- LOD fraction labels (on top), faded in by on-screen radius ----
  if (labels.length > 0) {
    ctx.fillStyle = labelColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const l of labels) {
      const fade = smoothstep((l.r - labelMinR) / Math.max(1, labelFullR - labelMinR));
      if (fade <= 0.01) continue;
      const fs = Math.min(Math.max(l.r * 0.5, 10 * dpr), 16 * dpr);
      ctx.globalAlpha = fade;
      ctx.font = `${Math.round(fs)}px "JetBrains Mono", ui-monospace, monospace`;
      ctx.fillText(`${l.p}/${l.q}`, l.x, l.y - l.r * 0.42);
    }
    ctx.globalAlpha = 1;
  }
}
