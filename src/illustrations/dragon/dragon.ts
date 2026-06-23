// Heighway dragon curve generator. Pure: no DOM, no canvas.
//
// The curve is walked directly from the closed-form paper-folding turn rule
// (OEIS A014577) — no string rewriting, no O(2^k) allocation beyond the output
// buffer. See the illustration doc §2 for the math.

export type DragonGeom = {
  /** Flat [x0,y0, x1,y1, …] — length 2 * (2^order + 1). */
  points: Float64Array;
  /** Segment count = 2^order. */
  count: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

/**
 * The turn after segment `i` (1-indexed) of the regular paper-folding sequence
 * (A014577): `true` = Right (clockwise), `false` = Left. Determined by the bit
 * just above the lowest set bit of `i`: Right iff that bit is 0.
 *
 * Verified against R,R,L,R,R,L,L,R,R,R,L,L,R,L,L (see dragon.test.ts).
 */
export function turnRight(i: number): boolean {
  const lowestSetBit = i & -i; // isolates the lowest set bit of i
  return (i & (lowestSetBit << 1)) === 0; // Right iff the next-higher bit is 0
}

// Integer-lattice directions: 0=+x, 1=+y, 2=−x, 3=−y.
const DX = [1, 0, -1, 0];
const DY = [0, 1, 0, -1];

const FULL_FOLD = Math.PI / 2;

/**
 * Generate the order-`order` dragon as a packed polyline.
 *
 * `foldAngleRad` is the crease angle in radians: `π/2` (default) is the finished
 * dragon, `0` is a flat strip of collinear unit segments, and values between
 * sweep the "unfolding paper" morph. At the full fold we walk the integer
 * lattice exactly (clean integer coordinates); otherwise we accumulate a
 * floating heading and step `(cos, sin)` per segment.
 */
export function generateDragon(order: number, foldAngleRad: number = FULL_FOLD): DragonGeom {
  const count = 2 ** order; // segment count
  const points = new Float64Array(2 * (count + 1));

  let x = 0;
  let y = 0;
  let minX = 0;
  let maxX = 0;
  let minY = 0;
  let maxY = 0;
  points[0] = 0;
  points[1] = 0;

  const full = Math.abs(foldAngleRad - FULL_FOLD) < 1e-12;
  let p = 2;

  if (full) {
    // Exact lattice walk: advance one unit along `dir`, emit, then turn.
    let dir = 0;
    for (let i = 1; i <= count; i++) {
      x += DX[dir];
      y += DY[dir];
      points[p++] = x;
      points[p++] = y;
      if (x < minX) minX = x;
      else if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      else if (y > maxY) maxY = y;
      dir = turnRight(i) ? (dir + 3) & 3 : (dir + 1) & 3;
    }
  } else {
    // Floating-heading walk for the fold morph (Right = −θ, Left = +θ).
    let heading = 0;
    for (let i = 1; i <= count; i++) {
      x += Math.cos(heading);
      y += Math.sin(heading);
      points[p++] = x;
      points[p++] = y;
      if (x < minX) minX = x;
      else if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      else if (y > maxY) maxY = y;
      heading += turnRight(i) ? -foldAngleRad : foldAngleRad;
    }
  }

  return { points, count, minX, maxX, minY, maxY };
}
