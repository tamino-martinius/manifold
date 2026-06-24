import { groupThousands } from "../../shared/format";
import { type ChartDims, chartToScreen, xTicks, yTicks } from "./chart";
import type { GoldbachData } from "./goldbach";
import type { ColorBy } from "./state";

export type CometRenderOpts = {
  /** Number of leading points to draw (reveal prefix). */
  revealCount: number;
  colorBy: ColorBy;
  /** Dot diameter in CSS px (scaled by dpr internally). */
  pointSize: number;
  /** Per-dot alpha — overlapping dots accumulate into the comet's glow. */
  pointAlpha: number;
  /** Device-pixel ratio (for crisp axes/labels at any density). */
  dpr: number;
  /** x-axis max (E) — fit to the currently revealed values by the caller. */
  fitN: number;
  /** y-axis max (g) — fit to the currently revealed values by the caller. */
  fitMaxG: number;
};

const TAU = Math.PI * 2;

// Band palettes, keyed so the top (6 | E) band is the most prominent hue. The
// dark set is the design-system --hue-* tokens (bright on phosphor dark); the
// light set is deepened so each hue holds contrast on the fuchsia-light surface.
const BANDS = {
  dark: { amber: "#ffb000", cyan: "#22d3ee", violet: "#9d8cff" },
  light: { amber: "#a86a00", cyan: "#0e7490", violet: "#6d28d9" },
} as const;

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function isLight(): boolean {
  return document.documentElement.dataset.theme === "light";
}

// Bucket index for a given E under the active colouring. Even E has E mod 6 in
// {0, 2, 4}; 3 | E (for even E) is exactly E mod 6 === 0.
function bucketOf(E: number, colorBy: ColorBy): number {
  if (colorBy === "none") return 0;
  const r = E % 6;
  if (colorBy === "div3") return r === 0 ? 0 : 1;
  return r === 0 ? 0 : r === 2 ? 1 : 2; // mod6
}

// Resolved fill colour per bucket index for the active colouring.
function bucketColors(colorBy: ColorBy): string[] {
  if (colorBy === "none") return [cssVar("--accent") || "#3ddc84"];
  const b = isLight() ? BANDS.light : BANDS.dark;
  if (colorBy === "div3") return [b.amber, b.cyan];
  return [b.amber, b.cyan, b.violet];
}

function drawAxes(ctx: CanvasRenderingContext2D, d: ChartDims, dpr: number): void {
  const line = cssVar("--line-strong") || "#2a343a";
  const faint = cssVar("--text-faint") || "#6f7c83";
  const x0 = d.padLeft;
  const x1 = d.W - d.padRight;
  const yBottom = d.H - d.padBottom;
  const yTop = d.padTop;
  const tickLen = 4 * dpr;

  ctx.lineWidth = Math.max(1, dpr);
  ctx.strokeStyle = line;
  ctx.beginPath();
  ctx.moveTo(x0, yTop);
  ctx.lineTo(x0, yBottom);
  ctx.lineTo(x1, yBottom);
  ctx.stroke();

  ctx.fillStyle = faint;
  ctx.font = `${Math.round(10 * dpr)}px "JetBrains Mono", ui-monospace, monospace`;

  // x ticks + labels (skip 0, it crowds the y axis).
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (const t of xTicks(d)) {
    if (t.value === 0) continue;
    ctx.beginPath();
    ctx.moveTo(t.sx, yBottom);
    ctx.lineTo(t.sx, yBottom + tickLen);
    ctx.stroke();
    ctx.fillText(groupThousands(t.value), t.sx, yBottom + tickLen + 2 * dpr);
  }

  // y ticks + labels (skip 0).
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (const t of yTicks(d)) {
    if (t.value === 0) continue;
    ctx.beginPath();
    ctx.moveTo(x0 - tickLen, t.sy);
    ctx.lineTo(x0, t.sy);
    ctx.stroke();
    ctx.fillText(groupThousands(t.value), x0 - tickLen - 3 * dpr, t.sy);
  }

  // Axis titles.
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText("E", x1, yBottom - 4 * dpr);
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("g(E)", x0 + 4 * dpr, yTop);
}

/**
 * Draw the comet: axes + labelled ticks, then the revealed prefix of dots
 * batched by colour bucket (one fillStyle run per hue). Cleared to transparent
 * so the page dot-grid shows through.
 */
export function renderComet(
  ctx: CanvasRenderingContext2D,
  data: GoldbachData,
  opts: CometRenderOpts,
  W: number,
  H: number,
): void {
  ctx.clearRect(0, 0, W, H);
  ctx.globalAlpha = 1;

  const dpr = opts.dpr;
  const count = data.E.length;
  const d: ChartDims = {
    W,
    H,
    padLeft: 52 * dpr,
    padRight: 18 * dpr,
    padTop: 18 * dpr,
    padBottom: 30 * dpr,
    N: Math.max(1, opts.fitN),
    maxG: Math.max(1, opts.fitMaxG),
  };

  drawAxes(ctx, d, dpr);

  const reveal = Math.min(Math.max(0, Math.floor(opts.revealCount)), count);
  if (reveal <= 0) return;

  const colors = bucketColors(opts.colorBy);
  const r = Math.max(0.5, (opts.pointSize * dpr) / 2);
  const { E, g } = data;

  // Round dots, each filled individually so overlaps composite (accumulate) at
  // the per-dot alpha — that density-driven build-up is what paints the glow.
  ctx.globalAlpha = Math.max(0, Math.min(1, opts.pointAlpha));
  for (let b = 0; b < colors.length; b++) {
    ctx.fillStyle = colors[b];
    for (let i = 0; i < reveal; i++) {
      if (colors.length > 1 && bucketOf(E[i], opts.colorBy) !== b) continue;
      const { sx, sy } = chartToScreen(d, E[i], g[i]);
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, TAU);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}
