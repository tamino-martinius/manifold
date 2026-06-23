import type { Camera } from "./camera";
import type { PlacedData } from "./types";

// On-screen world-unit size (px) at/above which rounded caps read cleanly.
const ROUND_CAP_FROM = 6;

/** Stroke width (px) for a world-unit scale (1 lattice unit = 1 world unit). */
export function strokeWidthFor(scale: number): number {
  return Math.max(0.75, scale * 0.16);
}

/**
 * Map a generation `frame` to drawable segment ranges. Segments are stored in
 * generation order, so generations `0…f-1` form the solid prefix `[0, solidEnd)`
 * and the single latest (frontier) generation `f` is `[outlineStart, outlineEnd)`.
 */
export function revealSlices(
  genSegEnds: number[],
  frame: number,
): { solidEnd: number; outlineStart: number; outlineEnd: number } {
  const G = genSegEnds.length;
  const g = Math.max(0, Math.min(Math.floor(frame), G));
  if (g <= 0) return { solidEnd: 0, outlineStart: 0, outlineEnd: 0 };
  const f = g - 1;
  const solidEnd = f > 0 ? genSegEnds[f - 1] : 0;
  const outlineEnd = genSegEnds[f];
  return { solidEnd, outlineStart: solidEnd, outlineEnd };
}

/**
 * Draw the revealed generations: those before the frontier as solid strokes, and
 * the single frontier generation as a hollow outline (drawn solid, then its core
 * erased with `destination-out` so the backdrop shows through). Segments are in
 * generation order; off-screen ones are culled.
 */
export function renderToothpicks(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  placed: PlacedData,
  frame: number,
  canvasW: number,
  canvasH: number,
): void {
  ctx.clearRect(0, 0, canvasW, canvasH);
  if (placed.segCount === 0) return;
  const { solidEnd, outlineStart, outlineEnd } = revealSlices(placed.genSegEnds, frame);
  if (outlineEnd <= 0) return;

  const { x1, y1, x2, y2, colorIndex, colors } = placed;
  const w = strokeWidthFor(cam.scale);
  ctx.lineCap = cam.scale >= ROUND_CAP_FROM ? "round" : "butt";
  ctx.lineJoin = "round";
  const margin = cam.scale * 2;

  const offscreen = (ax: number, ay: number, bx: number, by: number): boolean =>
    (ax < -margin && bx < -margin) ||
    (ax > canvasW + margin && bx > canvasW + margin) ||
    (ay < -margin && by < -margin) ||
    (ay > canvasH + margin && by > canvasH + margin);

  const path = (start: number, end: number, colorOnly: number | null): void => {
    ctx.beginPath();
    for (let i = start; i < end; i++) {
      if (colorOnly !== null && colorIndex[i] !== colorOnly) continue;
      const ax = x1[i] * cam.scale + cam.offsetX;
      const ay = -y1[i] * cam.scale + cam.offsetY;
      const bx = x2[i] * cam.scale + cam.offsetX;
      const by = -y2[i] * cam.scale + cam.offsetY;
      if (offscreen(ax, ay, bx, by)) continue;
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
    }
    ctx.stroke();
  };

  // Solid: generations before the frontier, batched per color.
  ctx.lineWidth = w;
  for (let c = 0; c < colors.length; c++) {
    ctx.strokeStyle = colors[c];
    path(0, solidEnd, c);
  }

  // Frontier: latest generation drawn solid, per color…
  for (let c = 0; c < colors.length; c++) {
    ctx.strokeStyle = colors[c];
    path(outlineStart, outlineEnd, c);
  }
  // …then hollow its core so it reads as an outline (skip when too thin to hollow).
  const coreW = w * 0.5;
  if (coreW >= 0.6) {
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineWidth = coreW;
    path(outlineStart, outlineEnd, null);
    ctx.restore();
  }
}
