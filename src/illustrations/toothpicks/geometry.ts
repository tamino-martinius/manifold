import type { Dir } from "./types";

// Rotate (x, y) by `by` quarter-turns counter-clockwise (math coords, +y up).
export function rotatePoint(x: number, y: number, by: Dir): [number, number] {
  switch (by) {
    case 0:
      return [x, y];
    case 1:
      return [-y || 0, x];
    case 2:
      return [-x || 0, -y || 0];
    default:
      return [y, -x || 0];
  }
}

// Compose two directions: rotate `d` by `by` quarter-turns.
export function rotateDir(d: Dir, by: Dir): Dir {
  return ((d + by) & 3) as Dir;
}

// Pack a lattice point into one integer key (covers |x|,|y| < 32768).
const KEY_OFFSET = 32768;
const KEY_STRIDE = 65536;
export function pointKey(x: number, y: number): number {
  return (x + KEY_OFFSET) * KEY_STRIDE + (y + KEY_OFFSET);
}
