import { hexToRgb } from "../../shared/color";
import { type Camera, worldToScreen } from "./camera";
import type { DragonGeom } from "./dragon";
import type { ColorMode } from "./state";

// Position-gradient ramps (cool "ice" identity, from the Manifold `--pal-ice`
// token). The ramp is theme-aware so the curve always contrasts with the sunken
// background — bright-ending on dark, mid/dark-ending on light — the same way
// the accent flips phosphor↔fuchsia between themes.
export const ICE_RAMP_DARK = ["#0c3a6b", "#22d3ee", "#e2faff"] as const;
export const ICE_RAMP_LIGHT = ["#072350", "#0e72b4", "#119bb0"] as const;
// Dramatic full-spectrum alternative (documented option, see doc §9).
export const SPECTRAL_RAMP = [
  "#ff004d",
  "#ff8a00",
  "#ffe600",
  "#3ddc84",
  "#22d3ee",
  "#6a5cff",
  "#ff2e97",
] as const;

export type DragonRenderOpts = {
  colorMode: ColorMode;
  tiling: boolean;
  /** Solid-mode stroke colour (theme accent). */
  accent: string;
  /** Solid-mode colours for the three extra tiling copies (90/180/270°). */
  hues: readonly [string, string, string];
  /** Per-position gradient stops for position mode: primary, then the three copies. */
  ramp: readonly string[];
  hueRamps: readonly [readonly string[], readonly string[], readonly string[]];
  /** Stroke width in device pixels. */
  lineWidth: number;
  /** Quantised colour buckets for the position gradient. */
  buckets?: number;
  /** Segments to draw (the iteration animation reveals a growing prefix). */
  limit?: number;
};

// Linear sample of a list of hex stops at t ∈ [0, 1].
function sampleRamp(stops: readonly string[], t: number): string {
  const u = t < 0 ? 0 : t > 1 ? 1 : t;
  if (stops.length === 1) return stops[0];
  const pos = u * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(pos));
  const f = pos - i;
  const a = hexToRgb(stops[i]);
  const b = hexToRgb(stops[i + 1]);
  const r = Math.round(a[0] + (b[0] - a[0]) * f);
  const g = Math.round(a[1] + (b[1] - a[1]) * f);
  const bl = Math.round(a[2] + (b[2] - a[2]) * f);
  return `rgb(${r}, ${g}, ${bl})`;
}

// Near-black / near-white anchors (the Manifold ink ramp ends) for shading a hue.
const INK_DARK: readonly [number, number, number] = [8, 11, 14];
const INK_LIGHT: readonly [number, number, number] = [240, 244, 246];

function toHex(r: number, g: number, b: number): string {
  const h = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

function mixHex(
  base: readonly [number, number, number],
  to: readonly [number, number, number],
  t: number,
): string {
  return toHex(
    base[0] + (to[0] - base[0]) * t,
    base[1] + (to[1] - base[1]) * t,
    base[2] + (to[2] - base[2]) * t,
  );
}

// A 3-stop position ramp of one hue: deep→bright shades on dark, deep→base on
// light (mirroring how the ice ramp and accent stay legible in both themes).
function buildHueRamp(baseHex: string, light: boolean): string[] {
  const b = hexToRgb(baseHex);
  return light
    ? [mixHex(b, INK_DARK, 0.55), mixHex(b, INK_DARK, 0.2), baseHex]
    : [mixHex(b, INK_DARK, 0.4), baseHex, mixHex(b, INK_LIGHT, 0.5)];
}

// Rotate (x, y) about the origin by quarter*90°.
function rotate(quarter: number, x: number, y: number): [number, number] {
  switch (quarter & 3) {
    case 1:
      return [-y, x];
    case 2:
      return [-x, -y];
    case 3:
      return [y, -x];
    default:
      return [x, y];
  }
}

// Stroke the first `count` segments of the polyline (optionally rotated) in a
// single colour.
function strokeWhole(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  geom: DragonGeom,
  quarter: number,
  color: string,
  count: number,
): void {
  const { points } = geom;
  ctx.strokeStyle = color;
  ctx.beginPath();
  const [x0, y0] = rotate(quarter, points[0], points[1]);
  const start = worldToScreen(cam, x0, y0);
  ctx.moveTo(start.sx, start.sy);
  for (let i = 1; i <= count; i++) {
    const [rx, ry] = rotate(quarter, points[2 * i], points[2 * i + 1]);
    const s = worldToScreen(cam, rx, ry);
    ctx.lineTo(s.sx, s.sy);
  }
  ctx.stroke();
}

// Stroke the polyline coloured along its length: one contiguous sub-path per
// quantised bucket (cheap even at order 18 — O(count) total). Buckets share
// their boundary vertex, so the colour bands meet seamlessly.
function strokeGradient(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  geom: DragonGeom,
  quarter: number,
  ramp: readonly string[],
  buckets: number,
  count: number,
): void {
  const { points } = geom;
  for (let b = 0; b < buckets; b++) {
    const lo = Math.round((b / buckets) * count);
    const hi = Math.round(((b + 1) / buckets) * count);
    if (hi <= lo) continue;
    ctx.strokeStyle = sampleRamp(ramp, (b + 0.5) / buckets);
    ctx.beginPath();
    const [x0, y0] = rotate(quarter, points[2 * lo], points[2 * lo + 1]);
    const start = worldToScreen(cam, x0, y0);
    ctx.moveTo(start.sx, start.sy);
    for (let i = lo + 1; i <= hi; i++) {
      const [rx, ry] = rotate(quarter, points[2 * i], points[2 * i + 1]);
      const s = worldToScreen(cam, rx, ry);
      ctx.lineTo(s.sx, s.sy);
    }
    ctx.stroke();
  }
}

/**
 * Render the dragon as one connected polyline (no fill), round joins/caps. When
 * tiling is on, three extra copies rotated 90/180/270° about the start vertex
 * are drawn behind the primary copy. In position mode every copy carries its own
 * position-dependent gradient (a distinct hue per copy); in solid mode each copy
 * is one flat colour.
 */
export function renderDragon(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  geom: DragonGeom,
  opts: DragonRenderOpts,
  canvasW: number,
  canvasH: number,
): void {
  ctx.clearRect(0, 0, canvasW, canvasH);
  const limit = Math.min(opts.limit ?? geom.count, geom.count);
  if (limit <= 0) return;

  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.lineWidth = opts.lineWidth;
  // Never ask for more colour bands than there are segments to draw.
  const buckets = Math.min(opts.buckets ?? 48, limit);
  const position = opts.colorMode === "position";

  // Extra copies (90/180/270°) drawn first, so the primary reads on top.
  if (opts.tiling) {
    for (let q = 1; q <= 3; q++) {
      if (position) strokeGradient(ctx, cam, geom, q, opts.hueRamps[q - 1], buckets, limit);
      else strokeWhole(ctx, cam, geom, q, opts.hues[q - 1], limit);
    }
  }

  // Primary copy (0°).
  if (position) strokeGradient(ctx, cam, geom, 0, opts.ramp, buckets, limit);
  else strokeWhole(ctx, cam, geom, 0, opts.accent, limit);
}

/**
 * Read theme-driven colours from CSS: the accent (solid mode), the three tiling
 * hues, and the theme-appropriate position-gradient ramp.
 */
export function readDragonPalette(): {
  accent: string;
  hues: [string, string, string];
  ramp: readonly string[];
  hueRamps: [string[], string[], string[]];
} {
  const cs = getComputedStyle(document.documentElement);
  const get = (name: string, fallback: string): string =>
    cs.getPropertyValue(name).trim() || fallback;
  const light = document.documentElement.dataset.theme === "light";
  // Violet / pink / amber for the three extra copies — well separated from the
  // blue→cyan primary ramp so the four-way tiling stays legible.
  const hues: [string, string, string] = [
    get("--hue-violet", "#9d8cff"),
    get("--hue-pink", "#ff2e97"),
    get("--hue-amber", "#ffb000"),
  ];
  return {
    accent: get("--accent", "#3ddc84"),
    hues,
    ramp: light ? ICE_RAMP_LIGHT : ICE_RAMP_DARK,
    hueRamps: [
      buildHueRamp(hues[0], light),
      buildHueRamp(hues[1], light),
      buildHueRamp(hues[2], light),
    ],
  };
}
