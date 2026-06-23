import type { Dir, Pt } from "./types";

// Number of lattice directions (octagonal grid: E, NE, N, NW, W, SW, S, SE).
export const DIR_COUNT = 8;

// One 45° CCW rotation in the exact (p,q,r,s) basis: (p,q,r,s) -> (-s, p, q, r).
function rot45(pt: Pt): Pt {
  return { p: -pt.s || 0, q: pt.p, r: pt.q, s: pt.r };
}

// Rotate a point by `by` eighth-turns (45° each) counter-clockwise.
export function rotatePt(pt: Pt, by: Dir): Pt {
  let out = pt;
  const n = ((by % DIR_COUNT) + DIR_COUNT) % DIR_COUNT;
  for (let i = 0; i < n; i++) out = rot45(out);
  return out;
}

// Unit step for each direction d = East rotated d eighth-turns.
export const UNIT: Pt[] = (() => {
  const arr: Pt[] = [];
  let cur: Pt = { p: 1, q: 0, r: 0, s: 0 };
  for (let d = 0; d < DIR_COUNT; d++) {
    arr.push(cur);
    cur = rot45(cur);
  }
  return arr;
})();

// Compose directions: rotate `d` by `by` eighth-turns.
export function rotateDir(d: Dir, by: Dir): Dir {
  return ((((d + by) % DIR_COUNT) + DIR_COUNT) % DIR_COUNT) as Dir;
}

// Exact integer sum of two points.
export function addPt(a: Pt, b: Pt): Pt {
  return { p: a.p + b.p, q: a.q + b.q, r: a.r + b.r, s: a.s + b.s };
}

// Pack a point into one safe integer (13-bit fields, range ±4095).
const KEY_BASE = 4096;
const KEY_M = 8192;
export function pointKey(pt: Pt): number {
  return (
    (((pt.p + KEY_BASE) * KEY_M + (pt.q + KEY_BASE)) * KEY_M + (pt.r + KEY_BASE)) * KEY_M +
    (pt.s + KEY_BASE)
  );
}

// Convert an exact point to world (screen) float coordinates.
const INV_SQRT2 = Math.SQRT1_2;
export function pointToScreen(pt: Pt): { x: number; y: number } {
  return {
    x: pt.p + (pt.q - pt.s) * INV_SQRT2,
    y: pt.r + (pt.q + pt.s) * INV_SQRT2,
  };
}
