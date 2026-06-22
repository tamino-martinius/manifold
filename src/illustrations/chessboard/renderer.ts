import { type Camera, worldToScreen } from "./camera";
import { coordToIndex } from "./spiral";
import type { Placement } from "./types";

const LIGHT = "#ece7df";
const DARK = "#c9bfae";
const NUMBER_COLOR = "#6b6256";
const MIN_CELL_PX_FOR_NUMBERS = 22;

export function cellShade(x: number, y: number): string {
  return (((x + y) % 2) + 2) % 2 === 0 ? LIGHT : DARK;
}

export function renderBoard(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  placements: Placement[],
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

  for (let y = worldYMin; y <= worldYMax; y++) {
    for (let x = worldXMin; x <= worldXMax; x++) {
      const { sx, sy } = worldToScreen(cam, x, y);
      ctx.fillStyle = cellShade(x, y);
      ctx.fillRect(sx - half, sy - half, cellPx, cellPx);
    }
  }

  const drawNumbers = cellPx >= MIN_CELL_PX_FOR_NUMBERS;
  if (drawNumbers) {
    ctx.fillStyle = NUMBER_COLOR;
    ctx.font = `${Math.floor(cellPx * 0.26)}px ui-monospace, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let y = worldYMin; y <= worldYMax; y++) {
      for (let x = worldXMin; x <= worldXMax; x++) {
        const { sx, sy } = worldToScreen(cam, x, y);
        ctx.fillText(String(coordToIndex(x, y)), sx, sy);
      }
    }
  }

  const limit = Math.min(frame, placements.length);
  const r = Math.max(2, half * 0.7);
  for (let i = 0; i < limit; i++) {
    const p = placements[i];
    const { sx, sy } = worldToScreen(cam, p.coord.x, p.coord.y);
    if (sx < -cellPx || sx > canvasW + cellPx || sy < -cellPx || sy > canvasH + cellPx) continue;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.lineWidth = Math.max(1, cellPx * 0.04);
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.stroke();
  }
}
