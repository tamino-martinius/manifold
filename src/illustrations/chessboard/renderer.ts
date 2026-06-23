import type { Camera } from "./camera";
import { coordToIndex } from "./spiral";
import type { PlacedData } from "./types";

// Cool-grey board panel (Manifold ink ramp), kept light in both themes so the
// black/red default pieces stay visible while integrating with the cool chrome.
const LIGHT = "#d6dde0";
const DARK = "#b7c1c6";
const LIGHT_RGB: readonly [number, number, number] = [0xd6, 0xdd, 0xe0];
const DARK_RGB: readonly [number, number, number] = [0xb7, 0xc1, 0xc6];
const MID_RGB: readonly [number, number, number] = [
  Math.round((LIGHT_RGB[0] + DARK_RGB[0]) / 2),
  Math.round((LIGHT_RGB[1] + DARK_RGB[1]) / 2),
  Math.round((LIGHT_RGB[2] + DARK_RGB[2]) / 2),
];
const MID = rgbStr(MID_RGB);
const NUMBER_COLOR = "#5a666d";
const OUTLINE = "rgba(255, 255, 255, 0.5)";

// Level-of-detail thresholds (on-screen cell size in px).
const MIN_CELL_PX_FOR_NUMBERS = 22;
const CHECKER_FADE_FULL = 16; // >= this cell size: full light/dark contrast
const CHECKER_FADE_ZERO = 6; //  <= this cell size: uniform mid tone (pattern gone)
const MIN_CELL_PX_FOR_ARCS = 7; // below this pieces draw as squares (cheaper than arcs)

function rgbStr(c: readonly [number, number, number]): string {
  return `rgb(${c[0] | 0}, ${c[1] | 0}, ${c[2] | 0})`;
}
function mix(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  t: number,
): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

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

  // Checkerboard whose contrast fades to a uniform mid tone as cells shrink, so
  // the pattern (and the borders between cells) dissolves smoothly instead of a
  // hard cutoff — no moiré at tiny cell sizes. Below the fade floor, one fill.
  let t = (cellPx - CHECKER_FADE_ZERO) / (CHECKER_FADE_FULL - CHECKER_FADE_ZERO);
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const contrast = t * t * (3 - 2 * t); // smoothstep
  if (contrast <= 0.02) {
    ctx.fillStyle = MID;
    ctx.fillRect(0, 0, canvasW, canvasH);
  } else {
    const lightC = rgbStr(mix(MID_RGB, LIGHT_RGB, contrast));
    const darkC = rgbStr(mix(MID_RGB, DARK_RGB, contrast));
    for (let y = worldYMin; y <= worldYMax; y++) {
      for (let x = worldXMin; x <= worldXMax; x++) {
        const sx = x * cam.scale + cam.offsetX;
        const sy = -y * cam.scale + cam.offsetY;
        ctx.fillStyle = (((x + y) % 2) + 2) % 2 === 0 ? lightC : darkC;
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
