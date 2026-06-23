// Pure math for Goldbach's comet: prime sieve + prime-pair counting.
//
// g(E) counts the unordered prime pairs (p, q) with p <= q and p + q = E.
// This is OEIS A045917, whose graph is Goldbach's comet. We emit the counts
// columnar (parallel typed arrays) for cheap rendering and zero-copy transfer
// out of the compute worker.

export type GoldbachData = {
  /** Even values 4, 6, …, N (length (N-2)/2 for N >= 4). */
  E: Int32Array;
  /** g[i] = A045917 count for E[i]. */
  g: Int32Array;
  /** Max of g — drives the y-axis fit. */
  maxG: number;
};

// Report compute progress every this many outer (ascending-prime) iterations.
const PROGRESS_INTERVAL = 256;

/**
 * Sieve of Eratosthenes. Returns a `Uint8Array` of length `n + 1` where entry
 * `i` is `1` iff `i` is prime (`0` and `1` are non-prime).
 */
export function sieve(n: number): Uint8Array {
  const isPrime = new Uint8Array(Math.max(0, n + 1));
  if (n < 2) return isPrime;
  isPrime.fill(1, 2, n + 1);
  for (let p = 2; p * p <= n; p++) {
    if (isPrime[p]) {
      for (let m = p * p; m <= n; m += p) isPrime[m] = 0;
    }
  }
  return isPrime;
}

/**
 * Sieve + pair accumulation, returned columnar. For each prime `p` ascending
 * and each prime `q >= p` with `p + q <= n`, increment `g[p + q]`; taking only
 * `q >= p` counts each unordered pair exactly once. Only even values 4..N are
 * emitted.
 *
 * `onProgress(done, total)` (optional) is called periodically so a worker can
 * drive a progress bar; `total` is the number of ascending primes `p` with
 * `2p <= n` (the outer-loop length).
 */
export function goldbachCounts(
  n: number,
  onProgress?: (done: number, total: number) => void,
): GoldbachData {
  if (n < 4) {
    onProgress?.(0, 0);
    return { E: new Int32Array(0), g: new Int32Array(0), maxG: 0 };
  }

  const isPrime = sieve(n);
  const primes: number[] = [];
  for (let i = 2; i <= n; i++) if (isPrime[i]) primes.push(i);

  // Outer loop runs only while 2p <= n (smallest sum for q >= p is 2p).
  let outerTotal = primes.length;
  for (let k = 0; k < primes.length; k++) {
    if (2 * primes[k] > n) {
      outerTotal = k;
      break;
    }
  }

  // Accumulate pair counts indexed by the sum E. Odd-indexed entries can be
  // touched (e.g. 2 + 3 = 5) but are never read — only even E is emitted.
  const gFull = new Int32Array(n + 1);
  for (let i = 0; i < primes.length; i++) {
    const p = primes[i];
    if (2 * p > n) break;
    for (let j = i; j < primes.length; j++) {
      const s = p + primes[j];
      if (s > n) break;
      gFull[s]++;
    }
    if (onProgress && (i + 1) % PROGRESS_INTERVAL === 0) onProgress(i + 1, outerTotal);
  }
  onProgress?.(outerTotal, outerTotal);

  const len = Math.floor((n - 2) / 2);
  const E = new Int32Array(len);
  const g = new Int32Array(len);
  let maxG = 0;
  for (let k = 0; k < len; k++) {
    const e = 4 + 2 * k;
    E[k] = e;
    const c = gFull[e];
    g[k] = c;
    if (c > maxG) maxG = c;
  }
  return { E, g, maxG };
}

/**
 * Per-`E` count (A045917) by the simpler method: loop `p` over `2..E/2` and
 * test whether both `p` and `E - p` are prime. Same answer as
 * {@link goldbachCounts}; exposed for test cross-checks.
 */
export function countPairs(n: number, E: number): number {
  const isPrime = sieve(n);
  let count = 0;
  const half = Math.floor(E / 2);
  for (let p = 2; p <= half; p++) {
    if (isPrime[p] && isPrime[E - p]) count++;
  }
  return count;
}
