/**
 * Columnar form of the lit primes, used for rendering and for zero-copy transfer
 * out of the compute worker. Each prime's `idx` is its integer value (= 1-based
 * spiral index), ascending — so a timeline that reveals integers 1..N can draw
 * exactly the primes with `idx ≤ frame`. `colorIndex[i]` is 0 for a plain accent
 * prime, 1 for a highlight-set prime (the second hue).
 */
export type UlamData = {
  xs: Int32Array;
  ys: Int32Array;
  idx: Int32Array;
  colorIndex: Uint8Array;
  count: number;
};

export const EMPTY_ULAM: UlamData = {
  xs: new Int32Array(0),
  ys: new Int32Array(0),
  idx: new Int32Array(0),
  colorIndex: new Uint8Array(0),
  count: 0,
};
