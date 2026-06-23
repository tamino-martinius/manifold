import type { Camera } from "../chessboard/camera";
import type { PrimeSpiralData } from "./types";

const TAU = Math.PI * 2;

// Dot level-of-detail: radius eases from RMAX (sparse, zoomed in) down to a
// near-pixel floor (dense, zoomed out), keyed on the on-screen world scale —
// large scale ⇒ few points spread out ⇒ big dots; tiny scale ⇒ packed ⇒ pixels.
const R_MIN = 0.7;
const R_MAX = 2.6;
const SCALE_LO = 0.35; // <= this world-units-per-px: densest (floor radius)
const SCALE_HI = 6; //   >= this: sparsest (max radius)
// Below this radius, dots are drawn as sharp squares (one fillRect) instead of
// anti-aliased arcs — far cheaper at the hundreds-of-thousands-of-points scale.
const ROUND_MIN_RADIUS = 1.2;

// Manifold `--pal-spectral` stops (colors.css). Sampled into an m-color hue ramp
// so each residue arm gets one vivid, theme-independent color.
const SPECTRAL: readonly [number, number, number][] = [
  [0xff, 0x00, 0x4d],
  [0xff, 0x8a, 0x00],
  [0xff, 0xe6, 0x00],
  [0x3d, 0xdc, 0x84],
  [0x22, 0xd3, 0xee],
  [0x6a, 0x5c, 0xff],
  [0xff, 0x2e, 0x97],
];

const rampCache = new Map<number, string[]>();

function sampleSpectral(t: number): string {
  const p = t * (SPECTRAL.length - 1);
  const i = Math.min(SPECTRAL.length - 2, Math.floor(p));
  const f = p - i;
  const a = SPECTRAL[i];
  const b = SPECTRAL[i + 1];
  const r = Math.round(a[0] + (b[0] - a[0]) * f);
  const g = Math.round(a[1] + (b[1] - a[1]) * f);
  const bl = Math.round(a[2] + (b[2] - a[2]) * f);
  return `rgb(${r}, ${g}, ${bl})`;
}

/**
 * An `m`-color residue ramp sampled across the spectral palette. `t = i / m`
 * (not `i / (m-1)`) so the near-identical pink endpoints never collide on
 * adjacent arms. Memoized — built once per modulus.
 */
export function buildRamp(m: number): string[] {
  const cached = rampCache.get(m);
  if (cached) return cached;
  const ramp: string[] = [];
  for (let i = 0; i < m; i++) ramp.push(sampleSpectral(i / m));
  rampCache.set(m, ramp);
  return ramp;
}

export type SpiralRenderOptions = {
  /** Modulus for residue (arm) coloring, >= 2. */
  colorMod: number;
  showAll: boolean;
  dotScale: number;
  /** `--text-faint`, for the all-integers under-lattice. */
  faint: string;
  canvasW: number;
  canvasH: number;
};

export function renderSpiral(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  data: PrimeSpiralData,
  frame: number,
  opts: SpiralRenderOptions,
): void {
  const { canvasW, canvasH } = opts;
  ctx.clearRect(0, 0, canvasW, canvasH);

  const count = Math.min(Math.floor(frame), data.n);
  if (count <= 0 || data.n <= 0) return;

  // LOD radius from the camera scale (smoothstep between the two thresholds).
  let t = (cam.scale - SCALE_LO) / (SCALE_HI - SCALE_LO);
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const ease = t * t * (3 - 2 * t);
  const radius = Math.max(0.5, (R_MIN + (R_MAX - R_MIN) * ease) * opts.dotScale);
  const round = radius >= ROUND_MIN_RADIUS;
  const size = radius * 2;

  const { xs, ys, isPrime } = data;
  const sc = cam.scale;
  const ox = cam.offsetX;
  const oy = cam.offsetY;
  const lo = -radius - 1;
  const hiX = canvasW + radius + 1;
  const hiY = canvasH + radius + 1;

  const drawDot = (sx: number, sy: number): void => {
    if (round) {
      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, TAU);
      ctx.fill();
    } else {
      ctx.fillRect(sx - radius, sy - radius, size, size);
    }
  };

  // Layer 1 — every integer as a faint lattice, so the primes (drawn next) read
  // as a sample of the full arm structure. One fill style for the whole layer.
  if (opts.showAll) {
    ctx.fillStyle = opts.faint;
    for (let n = 1; n <= count; n++) {
      const sx = xs[n] * sc + ox;
      const sy = -ys[n] * sc + oy;
      if (sx < lo || sx > hiX || sy < lo || sy > hiY) continue;
      drawDot(sx, sy);
    }
  }

  // Layer 2 — the primes, colored by residue arm (n mod m). Single pass; the
  // fill style is reset only when the arm changes.
  const m = Math.max(2, Math.floor(opts.colorMod));
  const ramp = buildRamp(m);
  let curArm = -1;
  for (let n = 1; n <= count; n++) {
    if (isPrime[n] === 0) continue;
    const sx = xs[n] * sc + ox;
    const sy = -ys[n] * sc + oy;
    if (sx < lo || sx > hiX || sy < lo || sy > hiY) continue;
    const arm = n % m;
    if (arm !== curArm) {
      ctx.fillStyle = ramp[arm];
      curArm = arm;
    }
    drawDot(sx, sy);
  }
}
