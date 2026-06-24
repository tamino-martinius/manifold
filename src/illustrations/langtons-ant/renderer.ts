// Canvas renderer for Langton's Ant. Unpainted cells are left transparent so the
// page dot-grid shows through; only nonzero cells are painted. Visible-bbox cull
// + LOD keep large turmite fills cheap. Verified by hand / the preview, not unit
// tested.
import { type AntSim, trailKeys, unpackX, unpackY } from "./ant";
import type { Camera } from "./camera";

type RGB = [number, number, number];

// Vivid spectral stops (Manifold data hues) for multi-state turmites; color
// index i (1..k-1) samples along this gradient. Reads well in both themes.
const SPECTRAL: RGB[] = [
  [0x22, 0xd3, 0xee], // cyan
  [0x3d, 0xdc, 0x84], // phosphor
  [0xff, 0xb0, 0x00], // amber
  [0xff, 0x5b, 0x47], // red
  [0x9d, 0x8c, 0xff], // violet
  [0xff, 0x2e, 0x97], // pink
];

// Level-of-detail thresholds (on-screen cell size, px).
const GRID_FADE_ZERO = 7; // <= this: no grid lines
const GRID_FADE_FULL = 16; // >= this: full-strength grid lines
const ANT_DOT_BELOW = 7; // cell smaller than this: draw the ant as a dot, not a triangle

// Screen-space forward unit vector per heading (N,E,S,W). World y points up, so
// screen y is flipped: heading N (world +y) points to screen -y.
const SFX = [0, 1, 0, -1] as const;
const SFY = [-1, 0, 1, 0] as const;

type Palette = { text: RGB; accent: RGB; line: RGB };
let cachedTheme = "";
let cachedPalette: Palette | null = null;

// Resolve a CSS color expression (possibly a var() chain) to concrete RGB by
// letting the browser compute it on a probe element.
function resolveRgb(expr: string): RGB {
  const probe = document.createElement("span");
  probe.style.color = expr;
  probe.style.display = "none";
  document.body.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();
  const m = computed.match(/[\d.]+/g);
  return m ? [Number(m[0]), Number(m[1]), Number(m[2])] : [0, 0, 0];
}

function themeColors(): Palette {
  const theme = document.documentElement.dataset.theme ?? "";
  if (theme === cachedTheme && cachedPalette) return cachedPalette;
  cachedTheme = theme;
  cachedPalette = {
    text: resolveRgb("var(--text)"),
    accent: resolveRgb("var(--accent)"),
    line: resolveRgb("var(--line-strong)"),
  };
  return cachedPalette;
}

function rgb(c: RGB): string {
  return `rgb(${c[0] | 0}, ${c[1] | 0}, ${c[2] | 0})`;
}
function rgba(c: RGB, a: number): string {
  return `rgba(${c[0] | 0}, ${c[1] | 0}, ${c[2] | 0}, ${a})`;
}
function sampleSpectral(t: number): RGB {
  const clamped = t < 0 ? 0 : t > 1 ? 1 : t;
  const f = clamped * (SPECTRAL.length - 1);
  const i = Math.min(SPECTRAL.length - 2, Math.floor(f));
  const u = f - i;
  const a = SPECTRAL[i];
  const b = SPECTRAL[i + 1];
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
}

// Fill string per color index. Classic ant (k=2): the single painted color is
// the theme ink so it reads in both themes. Turmites: spectral gradient.
function paintColors(k: number, pal: Palette): string[] {
  const out: string[] = [""]; // index 0 is unpainted
  if (k === 2) {
    out.push(rgb(pal.text));
    return out;
  }
  for (let i = 1; i < k; i++) out.push(rgb(sampleSpectral((i - 1) / (k - 2))));
  return out;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  let t = (x - edge0) / (edge1 - edge0);
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return t * t * (3 - 2 * t);
}

export function renderAnt(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  sim: AntSim,
  canvasW: number,
  canvasH: number,
  showTrail: boolean,
): void {
  ctx.clearRect(0, 0, canvasW, canvasH);
  const cellPx = cam.scale;
  const pal = themeColors();

  // Visible world cell range (screen-y is flipped).
  const wxMin = Math.floor((0 - cam.offsetX) / cellPx) - 1;
  const wxMax = Math.ceil((canvasW - cam.offsetX) / cellPx) + 1;
  const wyMin = Math.floor((cam.offsetY - canvasH) / cellPx) - 1;
  const wyMax = Math.ceil((cam.offsetY - 0) / cellPx) + 1;

  // Grid lines — only when cells are large enough to read individually (LOD),
  // fading in smoothly so they never moiré against the dot-grid at small sizes.
  const gridA = smoothstep(GRID_FADE_ZERO, GRID_FADE_FULL, cellPx) * 0.5;
  if (gridA > 0.02) {
    ctx.strokeStyle = rgba(pal.line, gridA);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = wxMin; x <= wxMax + 1; x++) {
      const sx = Math.round((x - 0.5) * cellPx + cam.offsetX) + 0.5;
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, canvasH);
    }
    for (let y = wyMin; y <= wyMax + 1; y++) {
      const sy = Math.round(-(y - 0.5) * cellPx + cam.offsetY) + 0.5;
      ctx.moveTo(0, sy);
      ctx.lineTo(canvasW, sy);
    }
    ctx.stroke();
  }

  // Painted cells — only nonzero cells exist in the map. Cull to the visible
  // range. Classic ant is one color (fast path); turmites bucket by color.
  const colors = paintColors(sim.k, pal);
  const size = Math.max(1, cellPx);
  const half = size / 2;

  if (sim.k === 2) {
    ctx.fillStyle = colors[1];
    for (const key of sim.cells.keys()) {
      const x = unpackX(key);
      const y = unpackY(key);
      if (x < wxMin || x > wxMax || y < wyMin || y > wyMax) continue;
      ctx.fillRect(x * cellPx + cam.offsetX - half, -y * cellPx + cam.offsetY - half, size, size);
    }
  } else {
    const buckets: number[][] = Array.from({ length: sim.k }, () => []);
    for (const [key, c] of sim.cells) {
      const x = unpackX(key);
      const y = unpackY(key);
      if (x < wxMin || x > wxMax || y < wyMin || y > wyMax) continue;
      buckets[c].push(x * cellPx + cam.offsetX, -y * cellPx + cam.offsetY);
    }
    for (let c = 1; c < sim.k; c++) {
      const b = buckets[c];
      if (b.length === 0) continue;
      ctx.fillStyle = colors[c];
      for (let i = 0; i < b.length; i += 2) ctx.fillRect(b[i] - half, b[i + 1] - half, size, size);
    }
  }

  // Comet trail — recently-flipped cells tinted toward the accent, brightest at
  // the head. Off by default (costs per-step bookkeeping).
  if (showTrail && sim.trailLen > 0) {
    const keys = trailKeys(sim);
    for (let i = 0; i < keys.length; i++) {
      const x = unpackX(keys[i]);
      const y = unpackY(keys[i]);
      if (x < wxMin || x > wxMax || y < wyMin || y > wyMax) continue;
      ctx.fillStyle = rgba(pal.accent, 0.06 + 0.5 * (i / keys.length));
      ctx.fillRect(x * cellPx + cam.offsetX - half, -y * cellPx + cam.offsetY - half, size, size);
    }
  }

  drawAnt(ctx, cam, sim, cellPx, pal.accent);
}

function drawAnt(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  sim: AntSim,
  cellPx: number,
  accent: RGB,
): void {
  const sx = sim.x * cellPx + cam.offsetX;
  const sy = -sim.y * cellPx + cam.offsetY;

  // Faint halo so the ant is findable even zoomed out to "fit region".
  const haloR = Math.max(cellPx * 0.95, 11);
  ctx.fillStyle = rgba(accent, 0.16);
  ctx.beginPath();
  ctx.arc(sx, sy, haloR, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = rgb(accent);
  if (cellPx < ANT_DOT_BELOW) {
    ctx.beginPath();
    ctx.arc(sx, sy, Math.max(3.5, cellPx * 0.6), 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  // Triangle pointing along the heading.
  const r = cellPx * 0.42;
  const fx = SFX[sim.h];
  const fy = SFY[sim.h];
  const px = -fy; // perpendicular
  const py = fx;
  ctx.beginPath();
  ctx.moveTo(sx + fx * r, sy + fy * r); // tip
  ctx.lineTo(sx - fx * r * 0.75 + px * r * 0.72, sy - fy * r * 0.75 + py * r * 0.72);
  ctx.lineTo(sx - fx * r * 0.75 - px * r * 0.72, sy - fy * r * 0.75 - py * r * 0.72);
  ctx.closePath();
  ctx.fill();
}
