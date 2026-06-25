import type { Camera } from "./camera";
import { type RGB, sampleRamp } from "./palette";
import { type PascalResidues, isPerfect, isPrime, lucasMod } from "./pascal";
import type { ColorMode } from "./state";

// The gradient ramps each color mode draws from (parsed from the --pal-* tokens).
// Class modes (parity / prime / perfect) pick a ramp per class and vary the SHADE
// by the residue value, so "different odd residues → different shades of warm".
export type PascalRamps = {
  spectral: RGB[]; // hue-by-residue
  odd: RGB[]; // odd residues
  even: RGB[]; // even residues
  prime: RGB[]; // prime residues
  nonPrime: RGB[]; // non-prime residues
  perfect: RGB[]; // perfect residues
  nonPerfect: RGB[]; // non-perfect residues
};

// Theme-driven colors, read from CSS by colors.ts and passed in (keeps the
// renderer pure and reactive to the theme toggle).
export type PascalColors = {
  /** --accent: lit cells in binary mode (and the m=2 gasket). */
  lit: string;
  /** Cell-number ink — white, for high contrast over any lit cell. */
  number: string;
  ramps: PascalRamps;
};

export type PascalRenderInput = {
  m: number;
  colorMode: ColorMode;
  /** Composite m → packed residue cache; prime m → null (Lucas per visible cell). */
  residues: PascalResidues | null;
  colors: PascalColors;
};

// Level-of-detail thresholds (on-screen cell size in px).
const GROW_FROM = 16; // >= this cell size: crisp inset squares (gaps show the grid)
const GROW_TO = 4; //  <= this cell size: full, slightly-overlapping squares (solid mass)
// Cell numbers fade IN as cells grow past this window — auto-gated by zoom, no toggle.
const NUM_FADE_LO = 18;
const NUM_FADE_HI = 30;

function smoothstep(t: number): number {
  const c = t < 0 ? 0 : t > 1 ? 1 : t;
  return c * c * (3 - 2 * c);
}
function lerp(lo: number, hi: number, t: number): number {
  return lo + (hi - lo) * t;
}

// Color of a nonzero residue v under the active mode. For the class modes, the
// ramp is chosen by the class (prime/non-prime, perfect/non-perfect) and the
// shade tracks the value, so members of a class read as one color family.
function cellColor(mode: ColorMode, v: number, denom: number, colors: PascalColors): string {
  const t = (v - 1) / denom; // 0..1 across the residue range
  switch (mode) {
    case "hue":
      return sampleRamp(colors.ramps.spectral, t);
    case "parity":
      return v % 2 === 1
        ? sampleRamp(colors.ramps.odd, lerp(0.45, 1, t))
        : sampleRamp(colors.ramps.even, lerp(0.45, 0.95, t));
    case "prime":
      return isPrime(v)
        ? sampleRamp(colors.ramps.prime, lerp(0.45, 1, t))
        : sampleRamp(colors.ramps.nonPrime, lerp(0.45, 0.95, t));
    case "perfect":
      return isPerfect(v)
        ? sampleRamp(colors.ramps.perfect, lerp(0.55, 0.95, t))
        : sampleRamp(colors.ramps.nonPerfect, lerp(0.32, 0.72, t));
    default: // "binary"
      return colors.lit;
  }
}

/**
 * Draw the revealed Pascal-mod-m triangle. Culls to the cells visible under the
 * camera (never iterates the whole triangle), fades cell detail with the
 * on-screen cell size, batches by residue color, and fades residue numbers in at
 * high zoom. Residue is read from the packed cache for composite m, or computed
 * with Lucas' theorem per visible cell for prime m (deep-zoom-free).
 */
export function renderPascal(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  input: PascalRenderInput,
  shownRows: number,
  canvasW: number,
  canvasH: number,
): void {
  ctx.clearRect(0, 0, canvasW, canvasH);
  const rows = Math.max(0, Math.floor(shownRows));
  if (rows <= 0 || cam.scale <= 0) return;

  const { m, colorMode, residues, colors } = input;
  const res = residues;

  // Precompute the color of each nonzero residue 1..m-1 once per frame (m <= 128).
  const denom = Math.max(1, m - 1);
  const colorOf = new Array<string>(m);
  for (let r = 1; r < m; r++) colorOf[r] = cellColor(colorMode, r, denom, colors);

  const cellPx = cam.scale;
  // Visible world ranges. Row index i is world y; screen sy = i*scale + offsetY.
  const iMin = Math.max(0, Math.floor((0 - cam.offsetY) / cam.scale));
  const iMax = Math.min(rows - 1, Math.ceil((canvasH - cam.offsetY) / cam.scale));
  if (iMax < iMin) return;
  // x = j - i/2; screen sx = x*scale + offsetX.
  const xMin = (0 - cam.offsetX) / cam.scale;
  const xMax = (canvasW - cam.offsetX) / cam.scale;

  // Cell shape: crisp inset squares zoomed in → full overlapping squares zoomed
  // out, so the fractal fuses into a solid mass instead of aliasing into gaps.
  const ge = smoothstep((GROW_FROM - cellPx) / (GROW_FROM - GROW_TO));
  const size = Math.max(1, (0.86 + 0.14 * ge) * cellPx + ge * 0.75);
  const o = size / 2;

  // Pass 1: filled cells, batched by color (fillStyle only changes when needed).
  let lastColor = "";
  for (let i = iMin; i <= iMax; i++) {
    const sy = i * cam.scale + cam.offsetY;
    const halfI = i / 2;
    const jMin = Math.max(0, Math.ceil(xMin + halfI - 1));
    const jMax = Math.min(i, Math.floor(xMax + halfI + 1));
    const base = res ? res.rowStart[i] : 0;
    for (let j = jMin; j <= jMax; j++) {
      const v = res ? res.values[base + j] : lucasMod(i, j, m);
      if (v === 0) continue;
      const color = colorOf[v];
      if (color !== lastColor) {
        ctx.fillStyle = color;
        lastColor = color;
      }
      const sx = (j - halfI) * cam.scale + cam.offsetX;
      ctx.fillRect(sx - o, sy - o, size, size);
    }
  }

  // Pass 2: residue numbers — white with a dark halo so they stay legible over
  // any cell color, fading IN as cells grow (auto-gated by zoom, no toggle).
  const numAlpha = smoothstep((cellPx - NUM_FADE_LO) / (NUM_FADE_HI - NUM_FADE_LO));
  if (numAlpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = numAlpha;
  ctx.font = `600 ${Math.floor(cellPx * 0.34)}px ui-monospace, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(1, cellPx * 0.08);
  ctx.strokeStyle = "rgba(0, 0, 0, 0.55)";
  ctx.fillStyle = colors.number;
  for (let i = iMin; i <= iMax; i++) {
    const sy = i * cam.scale + cam.offsetY;
    const halfI = i / 2;
    const jMin = Math.max(0, Math.ceil(xMin + halfI - 1));
    const jMax = Math.min(i, Math.floor(xMax + halfI + 1));
    const base = res ? res.rowStart[i] : 0;
    for (let j = jMin; j <= jMax; j++) {
      const v = res ? res.values[base + j] : lucasMod(i, j, m);
      if (v === 0) continue;
      const sx = (j - halfI) * cam.scale + cam.offsetX;
      const txt = String(v);
      ctx.strokeText(txt, sx, sy);
      ctx.fillText(txt, sx, sy);
    }
  }
  ctx.restore();
}
