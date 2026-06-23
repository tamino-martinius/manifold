/**
 * Columnar spiral data, indexed by integer `n` (index 0 unused). `xs[n]`/`ys[n]`
 * are the precomputed Cartesian coords `n·cos n` / `n·sin n`; `isPrime[n]` is the
 * sieve mask. Typed arrays so the result transfers zero-copy out of the worker.
 * `n` is the max integer N (also the maximum reveal frame).
 */
export type PrimeSpiralData = {
  xs: Float64Array;
  ys: Float64Array;
  isPrime: Uint8Array;
  n: number;
};

export type ResourceKind = "video" | "oeis";
export type ResourceLink = { kind: ResourceKind; url: string; title: string; label: string };
