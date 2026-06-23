// Goldbach chart transform — a plain Cartesian plane (NOT the origin-centered
// spiral camera). x = even E in [0, N]; y = count g in [0, maxG], with screen-y
// flipped so g = 0 sits at the bottom and grows upward. Axes are anchored to the
// bottom-left of the padded plot rect. All coordinates are device pixels.

export type ChartDims = {
  /** Device-pixel canvas size. */
  W: number;
  H: number;
  /** Padding (device px) reserved for axes/labels. */
  padLeft: number;
  padRight: number;
  padTop: number;
  padBottom: number;
  /** Data ranges. */
  N: number;
  maxG: number;
};

export type Tick = { value: number; sx: number };
export type TickY = { value: number; sy: number };

// x: E ∈ [0, N]      → [padLeft, W − padRight]
// y: g ∈ [0, maxG]   → [H − padBottom, padTop]   (screen-y flipped)
export function chartToScreen(d: ChartDims, E: number, g: number): { sx: number; sy: number } {
  const sx = d.padLeft + (E / d.N) * (d.W - d.padLeft - d.padRight);
  const sy = d.H - d.padBottom - (g / d.maxG) * (d.H - d.padBottom - d.padTop);
  return { sx, sy };
}

/**
 * A "nice" tick step (1, 2, or 5 × 10^k) that yields roughly `target` intervals
 * across `[0, max]`.
 */
export function niceStep(max: number, target: number): number {
  if (max <= 0 || !Number.isFinite(max)) return 1;
  const raw = max / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const factor = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
  return factor * mag;
}

/** Round x-ticks across [0, N] with their screen-x positions. */
export function xTicks(d: ChartDims, target = 5): Tick[] {
  const step = niceStep(d.N, target);
  const ticks: Tick[] = [];
  for (let v = 0; v <= d.N + step * 1e-6; v += step) {
    const value = Math.round(v);
    ticks.push({ value, sx: chartToScreen(d, value, 0).sx });
  }
  return ticks;
}

/** Integer y-ticks across [0, maxG] with their screen-y positions. */
export function yTicks(d: ChartDims, target = 5): TickY[] {
  const step = Math.max(1, Math.round(niceStep(d.maxG, target)));
  const ticks: TickY[] = [];
  for (let v = 0; v <= d.maxG + 1e-6; v += step) {
    ticks.push({ value: v, sy: chartToScreen(d, 0, v).sy });
  }
  return ticks;
}
