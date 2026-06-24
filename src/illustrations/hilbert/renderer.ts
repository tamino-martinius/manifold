import { hexToRgb } from "../../shared/color";
import type { Camera } from "./camera";
import type { HilbertPath } from "./hilbert";
import type { ColorMode } from "./state";

// Spectral ramp stops — matches `--pal-spectral` in tokens/colors.css. Sampled
// in JS so the gradient-along-path reads identically to the design token.
const SPECTRAL_HEX = ["#ff004d", "#ff8a00", "#ffe600", "#3ddc84", "#22d3ee", "#6a5cff", "#ff2e97"];
const SPECTRAL = SPECTRAL_HEX.map(hexToRgb);

// A single stroke() can't vary color along its length cheaply, so the gradient
// is drawn as contiguous hue buckets (one stroke() per bucket) — bounded draw
// calls while the rainbow reads as continuous.
const HUE_BUCKETS = 32;

function sampleStops(stops: [number, number, number][], t: number): string {
  const c = t < 0 ? 0 : t > 1 ? 1 : t;
  const seg = c * (stops.length - 1);
  const i = Math.min(Math.floor(seg), stops.length - 2);
  const f = seg - i;
  const a = stops[i];
  const b = stops[i + 1];
  const r = Math.round(a[0] + (b[0] - a[0]) * f);
  const g = Math.round(a[1] + (b[1] - a[1]) * f);
  const bl = Math.round(a[2] + (b[2] - a[2]) * f);
  return `rgb(${r}, ${g}, ${bl})`;
}

function accentColor(): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
  return v || "#3ddc84";
}

/**
 * Draw the Hilbert polyline through cell centers, revealed up to `frame` points.
 * `gradient` paints index `d` as a hue from the spectral ramp (locality made
 * visible); `solid` uses one `--accent` stroke. Line width scales with the
 * on-screen cell size (thinner as `k` grows), clamped to a ≥ 1px floor.
 */
export function renderCurve(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  path: HilbertPath,
  frame: number,
  colorMode: ColorMode,
  canvasW: number,
  canvasH: number,
): void {
  ctx.clearRect(0, 0, canvasW, canvasH);
  const { xs, ys, n } = path;
  const limit = Math.min(Math.max(Math.floor(frame), 0), n);
  if (limit < 1 || n < 1) return;

  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const cellPx = cam.scale;
  const lineWidth = Math.max(1, Math.min(cellPx * 0.16, 7));
  ctx.lineWidth = lineWidth;

  // Cell centers are (x + 0.5, y + 0.5) in world space; inline the y-flipped
  // transform (no per-point allocation) so 262k points stay cheap.
  const sx = (i: number): number => (xs[i] + 0.5) * cam.scale + cam.offsetX;
  const sy = (i: number): number => -(ys[i] + 0.5) * cam.scale + cam.offsetY;

  const last = limit - 1; // last revealed point index

  if (limit >= 2) {
    if (colorMode === "solid") {
      ctx.strokeStyle = accentColor();
      ctx.beginPath();
      ctx.moveTo(sx(0), sy(0));
      for (let i = 1; i < limit; i++) ctx.lineTo(sx(i), sy(i));
      ctx.stroke();
    } else {
      // Each bucket owns a contiguous run of indices (t = d/(n-1) is monotonic),
      // so its hue is stable regardless of how much is drawn — that color
      // stability across the 2-D weave IS the locality reading. Buckets share
      // boundary points, so the polyline stays continuous across stroke()s.
      const denom = n - 1;
      for (let b = 0; b < HUE_BUCKETS; b++) {
        const pStart = Math.ceil((b * denom) / HUE_BUCKETS);
        const pEnd = Math.min(Math.ceil(((b + 1) * denom) / HUE_BUCKETS), last);
        if (pStart >= last) break;
        if (pEnd <= pStart) continue;
        ctx.strokeStyle = sampleStops(SPECTRAL, (b + 0.5) / HUE_BUCKETS);
        ctx.beginPath();
        ctx.moveTo(sx(pStart), sy(pStart));
        for (let p = pStart + 1; p <= pEnd; p++) ctx.lineTo(sx(p), sy(p));
        ctx.stroke();
      }
    }
  }

  // Leading edge: a dot at the frontier while the path is still revealing.
  if (limit < n) {
    const dotR = Math.max(1.5, lineWidth * 0.9);
    ctx.fillStyle =
      colorMode === "solid" ? accentColor() : sampleStops(SPECTRAL, n > 1 ? last / (n - 1) : 0);
    ctx.beginPath();
    ctx.arc(sx(last), sy(last), dotR, 0, Math.PI * 2);
    ctx.fill();
  }
}
