import type { Camera } from "./camera";
import { coordToIndex } from "./spiral";
import type { PlacedData } from "./types";

// Cool-grey board panel (Manifold ink ramp), kept light in both themes so the
// black/red default pieces stay visible while integrating with the cool chrome.
const LIGHT = "#d6dde0";
const DARK = "#b7c1c6";
const NUMBER_COLOR = "#5a666d";
const OUTLINE = "rgba(255, 255, 255, 0.5)";

// Level-of-detail thresholds (on-screen cell size in px).
const MIN_CELL_PX_FOR_NUMBERS = 22;
const MIN_CELL_PX_FOR_CHECKER = 5; // below this the board pattern is hidden (dot-grid shows through)
const MIN_CELL_PX_FOR_ARCS = 7; // below this pieces draw as squares (cheaper than arcs)

export function cellShade(x: number, y: number): string {
  return (((x + y) % 2) + 2) % 2 === 0 ? LIGHT : DARK;
}

export function renderBoard(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  placed: PlacedData,
  frame: number,
  canvasW: number,
  canvasH: number,
): void {
  ctx.clearRect(0, 0, canvasW, canvasH);

  // Visible world cell range (note screen-y is flipped).
  const worldXMin = Math.floor((0 - cam.offsetX) / cam.scale) - 1;
  const worldXMax = Math.ceil((canvasW - cam.offsetX) / cam.scale) + 1;
  const worldYMin = Math.floor((cam.offsetY - canvasH) / cam.scale) - 1;
  const worldYMax = Math.ceil((cam.offsetY - 0) / cam.scale) + 1;

  const cellPx = cam.scale;
  const half = cellPx / 2;

  // Checkerboard — hidden when zoomed far out (the dot-grid behind the canvas
  // shows through the cleared, transparent board).
  if (cellPx >= MIN_CELL_PX_FOR_CHECKER) {
    for (let y = worldYMin; y <= worldYMax; y++) {
      for (let x = worldXMin; x <= worldXMax; x++) {
        const sx = x * cam.scale + cam.offsetX;
        const sy = -y * cam.scale + cam.offsetY;
        ctx.fillStyle = cellShade(x, y);
        ctx.fillRect(sx - half, sy - half, cellPx, cellPx);
      }
    }
  }

  // Cell numbers — only when cells are large enough to read.
  if (cellPx >= MIN_CELL_PX_FOR_NUMBERS) {
    ctx.fillStyle = NUMBER_COLOR;
    ctx.font = `${Math.floor(cellPx * 0.26)}px ui-monospace, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let y = worldYMin; y <= worldYMax; y++) {
      for (let x = worldXMin; x <= worldXMax; x++) {
        ctx.fillText(
          String(coordToIndex(x, y)),
          x * cam.scale + cam.offsetX,
          -y * cam.scale + cam.offsetY,
        );
      }
    }
  }

  // Pieces — batched by color (one path/fill per color). Inline the transform
  // and cull off-screen so 100k+ stays cheap. Arcs when zoomed in, squares out.
  const limit = Math.min(Math.floor(frame), placed.count);
  if (limit <= 0) return;
  const { xs, ys, colorIndex, colors } = placed;
  const drawArcs = cellPx >= MIN_CELL_PX_FOR_ARCS;
  const r = Math.max(1, half * 0.7);
  const sz = Math.max(1, cellPx * 0.82);
  const off = -cellPx;
  const maxX = canvasW + cellPx;
  const maxY = canvasH + cellPx;

  for (let c = 0; c < colors.length; c++) {
    ctx.fillStyle = colors[c];
    if (drawArcs) {
      ctx.beginPath();
      for (let i = 0; i < limit; i++) {
        if (colorIndex[i] !== c) continue;
        const sx = xs[i] * cam.scale + cam.offsetX;
        const sy = -ys[i] * cam.scale + cam.offsetY;
        if (sx < off || sx > maxX || sy < off || sy > maxY) continue;
        ctx.moveTo(sx + r, sy);
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
      }
      ctx.fill();
      if (cellPx >= MIN_CELL_PX_FOR_NUMBERS) {
        ctx.lineWidth = Math.max(1, cellPx * 0.04);
        ctx.strokeStyle = OUTLINE;
        ctx.stroke();
      }
    } else {
      const o = sz / 2;
      for (let i = 0; i < limit; i++) {
        if (colorIndex[i] !== c) continue;
        const sx = xs[i] * cam.scale + cam.offsetX;
        const sy = -ys[i] * cam.scale + cam.offsetY;
        if (sx < off || sx > maxX || sy < off || sy > maxY) continue;
        ctx.fillRect(sx - o, sy - o, sz, sz);
      }
    }
  }
}
