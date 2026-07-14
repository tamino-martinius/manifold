// Cell-key encoding for the render-time board. The placement compute runs on a
// flat typed-array board (see field.ts); this Map-keyed form is used only by the
// seeker (board.ts) and renderer to reconstruct/draw the board at a scrubbed
// frame, where a sparse Map keyed by coordinate is the natural fit.

/** cellKey → colorIdx. A cell absent from the map is empty. */
export type Board = Map<number, number>;

// Encode (x, y) as one integer. ±8191 comfortably covers the ~510 spiral radius
// of a 1M-move fill, and the key stays < 2^31 so the Map keeps fast integer keys.
const OFFSET = 8192;
const STRIDE = 16384;

export function cellKey(x: number, y: number): number {
  return (x + OFFSET) * STRIDE + (y + OFFSET);
}
export function keyX(key: number): number {
  return Math.floor(key / STRIDE) - OFFSET;
}
export function keyY(key: number): number {
  return (key % STRIDE) - OFFSET;
}
