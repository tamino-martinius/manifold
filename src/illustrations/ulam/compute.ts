// Build the columnar lit-cell data for a given (N, mode, quad): sieve to N,
// derive the highlight flags, then walk the spiral once and pack every lit cell's
// coordinate, value and colour into typed arrays. Shared by the synchronous path
// and the worker.
//
// A cell is "lit" if it is prime (base colour) or a member of the highlight set
// (second colour, drawn even when not prime — squares/triangular trace a locus).
// The spiral is walked inline (mirroring chessboard/spiral.ts) rather than via the
// memoised `spiralCoordAt`, so N = 1e7 never allocates a 10M-entry coord cache.
import { type HighlightMode, type Quad, highlightFlags, sieve } from "./sieve";
import { EMPTY_ULAM, type UlamData } from "./types";

// E, N, W, S — same winding as chessboard/spiral.ts (cell 1 at the origin).
const DIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];

export function buildUlamData(
  n: number,
  mode: HighlightMode,
  quad: Quad,
  onProgress?: (done: number, total: number) => void,
): UlamData {
  if (n < 1) return EMPTY_ULAM;

  const s = sieve(n);
  // In "primes" mode every prime is the base colour — no second hue.
  const hl = mode === "primes" ? null : highlightFlags(s, n, mode, quad);

  let count = 0;
  for (let v = 1; v <= n; v++) {
    if (s[v] === 1 || (hl !== null && hl[v] === 1)) count++;
  }

  const xs = new Int32Array(count);
  const ys = new Int32Array(count);
  const idx = new Int32Array(count);
  const colorIndex = new Uint8Array(count);

  // Inline spiral walk: v = 1 sits at the origin, then step per the run pattern.
  let x = 0;
  let y = 0;
  let dir = 0;
  let runLength = 1;
  let stepsLeftInRun = 1;
  let runsAtLength = 0;
  let i = 0;
  for (let v = 1; v <= n; v++) {
    if (v > 1) {
      if (stepsLeftInRun === 0) {
        dir = (dir + 1) % 4;
        runsAtLength++;
        if (runsAtLength === 2) {
          runsAtLength = 0;
          runLength++;
        }
        stepsLeftInRun = runLength;
      }
      x += DIRS[dir][0];
      y += DIRS[dir][1];
      stepsLeftInRun--;
    }
    const highlighted = hl !== null && hl[v] === 1;
    if (s[v] === 1 || highlighted) {
      xs[i] = x;
      ys[i] = y;
      idx[i] = v;
      colorIndex[i] = highlighted ? 1 : 0;
      i++;
    }
    if (onProgress && (v & 0x3fff) === 0) onProgress(v, n);
  }
  onProgress?.(n, n);
  return { xs, ys, idx, colorIndex, count };
}
