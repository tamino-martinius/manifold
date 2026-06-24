import { primeMask } from "./sieve";
import type { PrimeSpiralData } from "./types";

// Report progress every this many integers while filling the coord arrays.
const PROGRESS_INTERVAL = 1 << 16; // 65536

/**
 * Build the columnar {@link PrimeSpiralData} for integers `1..N`: the prime mask
 * plus precomputed `n·cos n` / `n·sin n`. Pure and worker-callable; precomputing
 * the trig here keeps the render loop allocation-free for up to 1M points.
 */
export function buildSpiralData(n: number, onProgress?: (done: number) => void): PrimeSpiralData {
  const N = Math.max(0, Math.floor(n));
  const isPrime = primeMask(N);
  const xs = new Float64Array(N + 1);
  const ys = new Float64Array(N + 1);
  for (let i = 1; i <= N; i++) {
    xs[i] = i * Math.cos(i);
    ys[i] = i * Math.sin(i);
    if (onProgress && i % PROGRESS_INTERVAL === 0) onProgress(i);
  }
  onProgress?.(N);
  return { xs, ys, isPrime, n: N };
}
