// Pure Hilbert curve math: the index↔cell maps and the cached order-k path.
// The only non-trivial new math in this illustration. Deterministic + unit-tested.

export type Pt = { x: number; y: number };

/**
 * Map a 1-D Hilbert index `d` to its 2-D cell `(x, y)` on the 2^k × 2^k grid.
 * Iterative reference algorithm (Wikipedia "Hilbert curve") with quadrant
 * rotation applied bit-pair by bit-pair, MSB first.
 */
export function d2xy(k: number, d: number): Pt {
  let x = 0;
  let y = 0;
  let t = d;
  const n = 1 << k;
  for (let s = 1; s < n; s <<= 1) {
    const rx = 1 & (t >> 1);
    const ry = 1 & (t ^ rx);
    // Rotate the quadrant so the four sub-curves join end-to-end.
    if (ry === 0) {
      if (rx === 1) {
        x = s - 1 - x;
        y = s - 1 - y;
      }
      const tmp = x;
      x = y;
      y = tmp;
    }
    x += s * rx;
    y += s * ry;
    t >>= 2;
  }
  return { x, y };
}

/** Inverse of {@link d2xy}: map a cell `(x, y)` back to its Hilbert index `d`. */
export function xy2d(k: number, x: number, y: number): number {
  let d = 0;
  let cx = x;
  let cy = y;
  for (let s = (1 << k) >> 1; s > 0; s >>= 1) {
    const rx = (cx & s) > 0 ? 1 : 0;
    const ry = (cy & s) > 0 ? 1 : 0;
    d += s * s * ((3 * rx) ^ ry);
    // Same rotation d2xy applies (its inverse over the round trip).
    if (ry === 0) {
      if (rx === 1) {
        cx = s - 1 - cx;
        cy = s - 1 - cy;
      }
      const tmp = cx;
      cx = cy;
      cy = tmp;
    }
  }
  return d;
}

export type HilbertPath = { xs: Int32Array; ys: Int32Array; n: number };

// Memoize per order so frame/scrub/color re-renders never regenerate. Packed
// columnar (Int32Array) for cheap, allocation-free draws.
const pathCache = new Map<number, HilbertPath>();

/** The full order-k path `points[d] = d2xy(k, d)` for d = 0..4^k-1, cached per k. */
export function hilbertPath(k: number): HilbertPath {
  const cached = pathCache.get(k);
  if (cached) return cached;

  const n = 4 ** k;
  const xs = new Int32Array(n);
  const ys = new Int32Array(n);
  for (let d = 0; d < n; d++) {
    const { x, y } = d2xy(k, d);
    xs[d] = x;
    ys[d] = y;
  }
  const path: HilbertPath = { xs, ys, n };
  pathCache.set(k, path);
  return path;
}
