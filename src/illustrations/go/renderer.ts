import type { Camera } from "../chessboard/camera";
import { type Board, keyX, keyY } from "./gorules";

// Bright goban brown (theme-independent) and dark-brown grid lines / stone rings.
const BOARD = "#e6b25c";
const LINE_RGB = "107, 74, 43";
const OUTLINE_RGB = "38, 26, 12";

// LOD thresholds (on-screen cell size, px).
const LINE_FADE_ZERO = 8;
const LINE_FADE_FULL = 20;
const OUTLINE_FADE_ZERO = 12;
const OUTLINE_FADE_FULL = 22;
// Stones morph circle→square as cells shrink between these sizes.
const GROW_FROM = 16;
const GROW_TO = 4;

export function smoothstep(e0: number, e1: number, x: number): number {
  let t = (x - e0) / (e1 - e0);
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return t * t * (3 - 2 * t);
}

export function boardLineAlpha(cellPx: number): number {
  return smoothstep(LINE_FADE_ZERO, LINE_FADE_FULL, cellPx);
}
export function stoneOutlineAlpha(cellPx: number): number {
  return smoothstep(OUTLINE_FADE_ZERO, OUTLINE_FADE_FULL, cellPx);
}

/**
 * Stone footprint + corner radius for a given cell size. Zoomed in: a disc
 * (radius = size/2) at ~0.84 of the cell (a Go-stone gap). Zoomed out: the
 * corners un-round to a sharp square that slightly overlaps to seal seams.
 */
export function stoneGeometry(cellPx: number): { size: number; radius: number } {
  // far = 1 when zoomed out (small cells), 0 when zoomed in (large cells).
  const far = smoothstep(GROW_FROM, GROW_TO, cellPx);
  const size = Math.max(1.5, (0.84 + 0.16 * far) * cellPx + far * 0.75);
  const o = size / 2;
  const radius = o * (1 - far); // disc (radius = o) when near → sharp square (0) when far
  return { size, radius };
}

export function renderGoBoard(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  board: Board,
  colors: string[],
  canvasW: number,
  canvasH: number,
): void {
  ctx.clearRect(0, 0, canvasW, canvasH);
  ctx.fillStyle = BOARD;
  ctx.fillRect(0, 0, canvasW, canvasH);

  const cellPx = cam.scale;
  const worldXMin = Math.floor((0 - cam.offsetX) / cam.scale) - 1;
  const worldXMax = Math.ceil((canvasW - cam.offsetX) / cam.scale) + 1;
  const worldYMin = Math.floor((cam.offsetY - canvasH) / cam.scale) - 1;
  const worldYMax = Math.ceil((cam.offsetY - 0) / cam.scale) + 1;

  // Goban grid lines through cell centers, fading out as cells shrink.
  const la = boardLineAlpha(cellPx);
  if (la > 0.02) {
    ctx.strokeStyle = `rgba(${LINE_RGB}, ${la})`;
    ctx.lineWidth = Math.max(1, cellPx * 0.03);
    ctx.beginPath();
    for (let x = worldXMin; x <= worldXMax; x++) {
      const sx = x * cam.scale + cam.offsetX;
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, canvasH);
    }
    for (let y = worldYMin; y <= worldYMax; y++) {
      const sy = -y * cam.scale + cam.offsetY;
      ctx.moveTo(0, sy);
      ctx.lineTo(canvasW, sy);
    }
    ctx.stroke();
  }

  const { size, radius } = stoneGeometry(cellPx);
  const o = size / 2;
  const rounded = radius >= 0.5;
  const oa = stoneOutlineAlpha(cellPx);
  const off = -cellPx;
  const maxX = canvasW + cellPx;
  const maxY = canvasH + cellPx;

  // One pass over the live board buckets visible stones by color; each color is
  // then drawn in a single batched path (cheap — visible count is canvas-bounded).
  const bx: number[][] = colors.map(() => []);
  const by: number[][] = colors.map(() => []);
  for (const [key, c] of board) {
    const sx = keyX(key) * cam.scale + cam.offsetX;
    const sy = -keyY(key) * cam.scale + cam.offsetY;
    if (sx < off || sx > maxX || sy < off || sy > maxY) continue;
    bx[c].push(sx);
    by[c].push(sy);
  }
  for (let c = 0; c < colors.length; c++) {
    const xs = bx[c];
    const ys = by[c];
    if (xs.length === 0) continue;
    ctx.fillStyle = colors[c];
    if (rounded) {
      ctx.beginPath();
      for (let i = 0; i < xs.length; i++) ctx.roundRect(xs[i] - o, ys[i] - o, size, size, radius);
      ctx.fill();
      if (oa > 0.02) {
        ctx.lineWidth = Math.max(1, cellPx * 0.05);
        ctx.strokeStyle = `rgba(${OUTLINE_RGB}, ${oa})`;
        ctx.stroke();
      }
    } else {
      for (let i = 0; i < xs.length; i++) ctx.fillRect(xs[i] - o, ys[i] - o, size, size);
    }
  }
}
