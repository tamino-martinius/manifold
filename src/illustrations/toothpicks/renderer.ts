import type { Camera } from "./camera";
import type { PlacedData } from "./types";

// On-screen world-unit size (px) at/above which rounded caps read cleanly.
const ROUND_CAP_FROM = 6;

/** Stroke width (px) for a world-unit scale (1 lattice unit = 1 world unit). */
export function strokeWidthFor(scale: number): number {
  return Math.max(0.75, scale * 0.16);
}

/**
 * Draw the first `frame` toothpick instances as line segments, batched by color.
 * Segments are stored in ascending instance order, so each color pass breaks as
 * soon as it reaches an unrevealed instance. Off-screen segments are culled.
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
  const limit = Math.min(Math.floor(frame), placed.count);
  if (limit <= 0 || placed.segCount === 0) return;

  const { x1, y1, x2, y2, colorIndex, instanceIndex, colors } = placed;
  ctx.lineWidth = strokeWidthFor(cam.scale);
  ctx.lineCap = cam.scale >= ROUND_CAP_FROM ? "round" : "butt";
  ctx.lineJoin = "round";

  const margin = cam.scale * 2;
  for (let c = 0; c < colors.length; c++) {
    ctx.strokeStyle = colors[c];
    ctx.beginPath();
    for (let i = 0; i < placed.segCount; i++) {
      if (instanceIndex[i] >= limit) break; // segments are in instance order
      if (colorIndex[i] !== c) continue;
      const ax = x1[i] * cam.scale + cam.offsetX;
      const ay = -y1[i] * cam.scale + cam.offsetY;
      const bx = x2[i] * cam.scale + cam.offsetX;
      const by = -y2[i] * cam.scale + cam.offsetY;
      if (
        (ax < -margin && bx < -margin) ||
        (ax > canvasW + margin && bx > canvasW + margin) ||
        (ay < -margin && by < -margin) ||
        (ay > canvasH + margin && by > canvasH + margin)
      ) {
        continue;
      }
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
    }
    ctx.stroke();
  }
}
