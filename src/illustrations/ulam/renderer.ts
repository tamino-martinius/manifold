import type { Camera } from "../chessboard/camera";
import { coordToIndex } from "../chessboard/spiral";
import type { UlamData } from "./types";

// Cool-grey board tone (Manifold ink ramp), reused from chessboard and kept the
// same in both themes — the non-lit cells.
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

// Lit-cell colours — high contrast against the grey board in both themes (the
// chessboard's red/black). Index 0 = base (primes), 1 = highlight set.
const PALETTE: readonly [string, string] = ["#000000", "#e10600"];

// Level-of-detail thresholds (on-screen cell size in px).
const MIN_CELL_PX_FOR_NUMBERS = 22;
// The checker dissolves to a uniform mid tone early — its pattern only earns its
// keep when cells are large enough to read individual numbers; below that the
// alternating tones just add visual noise behind the point cloud.
const CHECKER_FADE_FULL = 24; // >= this cell size: full light/dark contrast
const CHECKER_FADE_ZERO = 14; // <= this cell size: uniform mid tone (pattern gone)
// Prime dots grow as cells shrink: discs at/above DOT_GROW_FROM, full overlapping
// squares at/below DOT_GROW_TO (rounded rects between) — the point cloud at scale.
const DOT_GROW_FROM = 16;
const DOT_GROW_TO = 4;

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

// Number of leading lit cells (idx ascending) with value ≤ maxVal — the reveal cut.
function revealedPrimes(idx: Int32Array, count: number, maxVal: number): number {
  let lo = 0;
  let hi = count;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (idx[mid] <= maxVal) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export function renderUlam(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  data: UlamData,
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
  const maxVal = Math.floor(frame);

  // Board: the non-lit cells. A checker whose contrast fades to a uniform mid
  // tone as cells shrink, so the primes read as a clean point cloud (no moiré).
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

  // Integer labels — auto-shown only when cells are large enough to read, and
  // only for cells already revealed (value ≤ frame) so labels track the dots.
  if (cellPx >= MIN_CELL_PX_FOR_NUMBERS) {
    ctx.fillStyle = NUMBER_COLOR;
    ctx.font = `${Math.floor(cellPx * 0.26)}px ui-monospace, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let y = worldYMin; y <= worldYMax; y++) {
      for (let x = worldXMin; x <= worldXMax; x++) {
        const v = coordToIndex(x, y);
        if (v > maxVal) continue;
        ctx.fillText(String(v), x * cam.scale + cam.offsetX, -y * cam.scale + cam.offsetY);
      }
    }
  }

  // Lit cells — batched by colour (base, then highlight), so the highlight set
  // draws last and sits on top. The shape grows with zoom-out: discs → rounded
  // rects → full slightly-overlapping squares.
  const limit = revealedPrimes(data.idx, data.count, maxVal);
  if (limit <= 0) return;
  const { xs, ys, colorIndex } = data;
  const palette = PALETTE;

  let gt = (DOT_GROW_FROM - cellPx) / (DOT_GROW_FROM - DOT_GROW_TO);
  gt = gt < 0 ? 0 : gt > 1 ? 1 : gt;
  const ge = gt * gt * (3 - 2 * gt); // smoothstep
  const size = Math.max(1.5, (0.72 + 0.28 * ge) * cellPx + ge * 0.75);
  const o = size / 2;
  const radius = o * (1 - ge); // circle (o) → rounded rect → sharp square (0)
  const rounded = radius >= 0.5;
  const drawOutline = cellPx >= MIN_CELL_PX_FOR_NUMBERS;
  const off = -cellPx;
  const maxX = canvasW + cellPx;
  const maxY = canvasH + cellPx;

  for (let c = 0; c < palette.length; c++) {
    ctx.fillStyle = palette[c];
    if (rounded) {
      ctx.beginPath();
      for (let i = 0; i < limit; i++) {
        if (colorIndex[i] !== c) continue;
        const sx = xs[i] * cam.scale + cam.offsetX;
        const sy = -ys[i] * cam.scale + cam.offsetY;
        if (sx < off || sx > maxX || sy < off || sy > maxY) continue;
        ctx.roundRect(sx - o, sy - o, size, size, radius);
      }
      ctx.fill();
      if (drawOutline) {
        ctx.lineWidth = Math.max(1, cellPx * 0.04);
        ctx.strokeStyle = OUTLINE;
        ctx.stroke();
      }
    } else {
      // Tiny sharp squares: per-item fillRect. Accumulating ~1M sub-paths into a
      // single Path2D makes the browser drop the whole fill (the "blank board").
      for (let i = 0; i < limit; i++) {
        if (colorIndex[i] !== c) continue;
        const sx = xs[i] * cam.scale + cam.offsetX;
        const sy = -ys[i] * cam.scale + cam.offsetY;
        if (sx < off || sx > maxX || sy < off || sy > maxY) continue;
        ctx.fillRect(sx - o, sy - o, size, size);
      }
    }
  }
}
